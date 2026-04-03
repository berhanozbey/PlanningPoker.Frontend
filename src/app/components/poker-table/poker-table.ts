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
  isVoting: boolean = false; 

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
    
    // ✨ GÜNCELLEME: Kullanıcı bilgilerini çekiyoruz
    this.myUserId = sessionStorage.getItem('userId') || '';
    this.myUserName = sessionStorage.getItem('userName') || '';
    this.myRole = Number(sessionStorage.getItem('userRole') || '0');

    // ✨ GÜMRÜK KONTROLÜ: Eğer isim veya ID yoksa, kullanıcıyı Join sayfasına yönlendir
    if (!this.myUserId || !this.myUserName) {
      console.warn("Kullanıcı bilgisi eksik, kayıt sayfasına yönlendiriliyor...");
      // Oda ID'sini de gönderiyoruz ki Join sayfası otomatik doldurabilsin
      this.router.navigate(['/join', this.roomId]);
      return; // Aşağıdaki SignalR bağlantılarının çalışmaması için burada kesiyoruz
    }

    this.loadRoomData();
    this.pokerService.startConnection();

    setTimeout(() => {
      this.pokerService.joinRoomSignalR(this.roomId, this.myUserId);
    }, 1000);

    this.subs.add(this.pokerService.userUpdated$.subscribe(() => {
      this.zone.run(() => { this.loadRoomData(); });
    }));

    this.subs.add(this.pokerService.votesRevealed$.subscribe(() => {
      this.zone.run(() => {
        if (this.countdown === 0 && !this.isVotingRevealed) {
          this.startCountdown();
        }
      });
    }));

    this.subs.add(this.pokerService.votesCleared$.subscribe(() => {
      this.zone.run(() => {
        this.clearLocalState();
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

  clearLocalState() {
    this.stopCountdown();
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

  startCountdown() {
    this.stopCountdown();
    this.showEditPopover = false;
    this.countdown = 3;
    this.cdr.detectChanges();

    this.timerInterval = setInterval(() => {
      this.zone.run(() => {
        this.countdown--;

        if (this.countdown <= 0) {
          this.stopCountdown();
          this.countdown = 0;
          this.isVotingRevealed = true;
          this.calculateAverage();
        }
        this.cdr.detectChanges();
      });
    }, 1000);
  }

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
    const fullUrl = window.location.href; 
    navigator.clipboard.writeText(fullUrl).then(() => {
      this.copySuccess = true;
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
    if (this.countdown === 0 && !this.isVoting) {
      this.showEditPopover = !this.showEditPopover;
      this.cdr.detectChanges();
    }
  }

  selectCard(card: string) {
    if (this.myRole === 2 || this.countdown > 0 || this.isVoting) return;

    this.isVoting = true;
    this.showEditPopover = false;

    const me = this.users.find(u => u.id === this.myUserId);
    if (me) {
      if (this.myCurrentVote !== null && this.myCurrentVote !== card) {
        me.isEdited = true;
        this.hasEditedLocal = true;
      }
      me.currentVote = card;
    }
    
    this.myCurrentVote = card;

    if (this.isVotingRevealed) {
      this.calculateAverage();
    }

    this.cdr.detectChanges();
    this.pokerService.submitVote(this.roomId, this.myUserId, card);
    
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
    this.stopCountdown();
    this.subs.unsubscribe();
  }
}