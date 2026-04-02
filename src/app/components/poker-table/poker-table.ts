import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlanningPokerService } from '../../services/planning-poker';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-poker-table',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './poker-table.html',
  styleUrl: './poker-table.css'
})
export class PokerTable implements OnInit, OnDestroy {
  roomId: string = '';
  roomName: string = '';
  isVotingRevealed: boolean = false;
  countdown: number = 0;
  average: number = 0;
  copySuccess: boolean = false;

  users: any[] = [];
  myUserId: string = '';
  myUserName: string = '';
  myRole: number = 0;
  myCurrentVote: string | null = null;
  currentTaskName: string = 'Pick your cards!';

  // UI Durumları
  showEditPopover: boolean = false;
  hasEditedLocal: boolean = false;
  isVoting: boolean = false; // ✨ YENİ: Çift tıklamayı (Race Condition) önlemek için kilit (Lock)

  private timerInterval: any;
  availableCards: string[] = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '55', '89', '?', '☕'];
  private subs: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private pokerService: PlanningPokerService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit() {
    this.roomId = this.route.snapshot.paramMap.get('id') || '';
    this.myUserId = sessionStorage.getItem('userId') || '';
    this.myUserName = sessionStorage.getItem('userName') || '';
    this.myRole = Number(sessionStorage.getItem('userRole') || '0');

    this.loadRoomData();
    this.pokerService.startConnection();

    setTimeout(() => {
      this.pokerService.joinRoomSignalR(this.roomId, this.myUserId);
    }, 1000);

    // ✨ GÜNCELLEME: Tüm SignalR aboneliklerini daha güvenli hale getirdik
    this.subs.add(this.pokerService.userUpdated$.subscribe(() => {
      this.zone.run(() => { this.loadRoomData(); });
    }));

    this.subs.add(this.pokerService.votesRevealed$.subscribe(() => {
      this.zone.run(() => {
        // Eğer zaten geri sayım başlamadıysa ve oylar henüz açılmadıysa başlat
        if (this.countdown === 0 && !this.isVotingRevealed) {
          this.startCountdown();
        }
      });
    }));

    this.subs.add(this.pokerService.votesCleared$.subscribe(() => {
      this.zone.run(() => {
        this.clearLocalState(); // ✨ YENİ: Temizleme işlemini merkezi bir fonksiyona aldık
        this.loadRoomData();
      });
    }));

    this.subs.add(this.pokerService.taskChanged$.subscribe((newTask: string) => {
      this.zone.run(() => {
        this.currentTaskName = newTask;
        this.cdr.detectChanges();
      });
    }));
  }

  // ✨ YENİ: Tur sıfırlandığında her şeyi kesin olarak temizleyen fonksiyon
  clearLocalState() {
    this.stopCountdown(); // Sayacı kesin durdur
    this.isVotingRevealed = false;
    this.countdown = 0;
    this.average = 0;
    this.myCurrentVote = null;
    this.showEditPopover = false;
    this.hasEditedLocal = false;
    this.isVoting = false;
  }

  loadRoomData() {
    this.pokerService.getRoom(this.roomId).subscribe({
      next: (room: any) => {
        this.roomName = room.name;
        this.users = room.users || [];
        this.currentTaskName = room.currentTaskName || 'Pick your cards!';

        if (this.countdown === 0) {
          this.isVotingRevealed = room.isVotingRevealed;
        }

        const me = this.users.find((u: any) => u.id === this.myUserId);
        
        // Eğer sunucuda oyumuz var ama lokalde yoksa eşitle
        if (me && this.myCurrentVote === null && me.currentVote !== null) {
            this.myCurrentVote = me.currentVote;
        }

        if (this.isVotingRevealed) {
          this.calculateAverage();
        }
        this.cdr.detectChanges();
      },
      error: (err: any) => {
          console.error("Failed to load room data:", err);
      }
    });
  }

  // ✨ GÜNCELLEME: Sayaç mantığı sağlamlaştırıldı
  startCountdown() {
    this.stopCountdown(); // Önceki sayacı kesinlikle durdurduğumuzdan emin olalım
    this.showEditPopover = false;
    this.countdown = 3;
    this.cdr.detectChanges();

    this.timerInterval = setInterval(() => {
      this.zone.run(() => {
        this.countdown--;

        if (this.countdown <= 0) {
          this.stopCountdown(); // Sayacı durdur
          this.countdown = 0;
          this.isVotingRevealed = true;
          this.calculateAverage();
        }
        this.cdr.detectChanges();
      });
    }, 1000);
  }

  // ✨ YENİ: Sayacı güvenli bir şekilde durduran yardımcı fonksiyon
  stopCountdown() {
      if (this.timerInterval) {
          clearInterval(this.timerInterval);
          this.timerInterval = null;
      }
  }

  calculateAverage() {
    const numericVotes = this.users
      .map(u => parseInt(u.currentVote))
      .filter(v => !isNaN(v));

    if (numericVotes.length > 0) {
      const sum = numericVotes.reduce((a, b) => a + b, 0);
      this.average = parseFloat((sum / numericVotes.length).toFixed(1));
    } else {
      this.average = 0;
    }
  }

  isOutlier(vote: string | null): boolean {
    if (!this.isVotingRevealed || this.countdown > 0 || !vote) return false;
    const v = parseInt(vote);
    if (isNaN(v)) return false;
    return Math.abs(v - this.average) > 2;
  }

copyRoomId() {
  // window.location.href -> Tarayıcı çubuğundaki tam linki alır (domain + path + ID)
  const fullUrl = window.location.href; 

  navigator.clipboard.writeText(fullUrl).then(() => {
    this.copySuccess = true;
    
    // 2 saniye sonra "Copied!" yazısını eski haline döndürür
    setTimeout(() => this.copySuccess = false, 2000);
  }).catch(err => {
    console.error('Link kopyalanamadı:', err);
  });
}
  leaveRoom() {
    if (confirm('Odadan ayrılmak istediğinize emin misiniz?')) {
      this.pokerService.leaveRoom(this.roomId, this.myUserId).subscribe({
        next: () => { sessionStorage.clear(); this.router.navigate(['/']); }
      });
    }
  }

  toggleEditPopover() {
    if (this.countdown === 0 && !this.isVoting) { // isVoting kontrolü eklendi
      this.showEditPopover = !this.showEditPopover;
      this.cdr.detectChanges();
    }
  }

  // ✨ GÜNCELLEME: Çift Tıklama (Race Condition) Kesin Çözümü
  selectCard(card: string) {
    // Kurallar: İzleyiciysen, geri sayım varsa veya ŞU AN İŞLEM YAPIYORSA (isVoting) engelle
    if (this.myRole === 2 || this.countdown > 0 || this.isVoting) return;

    this.isVoting = true; // ✨ YENİ: İşlemi kilitle
    this.showEditPopover = false;

    const me = this.users.find(u => u.id === this.myUserId);
    if (me) {
      if (this.myCurrentVote !== null && this.myCurrentVote !== card) {
        me.isEdited = true;
        this.hasEditedLocal = true; // Lokal düzenleme bayrağını ayarla
      }
      me.currentVote = card;
    }
    
    this.myCurrentVote = card;

    if (this.isVotingRevealed) {
      this.calculateAverage();
    }

    this.cdr.detectChanges(); // UI'ı anında güncelle

    // Sunucuya isteği gönder
    this.pokerService.submitVote(this.roomId, this.myUserId, card);
    
    // İşlem bittikten kısa bir süre sonra kilidi kaldır (Çift tıklamayı engeller)
    setTimeout(() => {
        this.isVoting = false;
        this.cdr.detectChanges();
    }, 500); 
  }

  revealVotes() { 
      if (this.myRole === 1 && !this.isVotingRevealed && this.countdown === 0) {
          this.pokerService.revealVotes(this.roomId); 
      }
  }

  clearVotes() { 
      if (this.myRole === 1) {
          this.pokerService.clearVotes(this.roomId); 
      }
  }

  addBot() { this.pokerService.addBot(this.roomId); }
  removeBots() { this.pokerService.removeBots(this.roomId); }

  ngOnDestroy() {
    this.stopCountdown(); // ✨ GÜNCELLEME: Bileşen yok edilirken sayacı kesin temizle
    this.subs.unsubscribe();
  }
}