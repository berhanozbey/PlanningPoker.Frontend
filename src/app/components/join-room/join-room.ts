import { Component, OnInit } from '@angular/core'; // OnInit eklendi
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router'; // ActivatedRoute eklendi
import { PlanningPokerService } from '../../services/planning-poker';

@Component({
  selector: 'app-join-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './join-room.html',
  styleUrl: './join-room.css'
})
export class JoinRoom implements OnInit { // OnInit eklendi
  existingRoomId: string = '';
  joinerName: string = '';
  joinerRole: number = 0; // Varsayılan: Developer (0)

  constructor(
    private pokerService: PlanningPokerService,
    private router: Router,
    private route: ActivatedRoute // Buraya eklendi
  ) {}

  ngOnInit() {
    // ✨ YENİ: URL'de bir ID parametresi varsa (Örn: /join/ODA-ID) onu yakalar
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.existingRoomId = idFromUrl;
      console.log("URL'den Oda ID'si yakalandı:", this.existingRoomId);
    }
  }

  // "Join Game" butonuna basıldığında çalışır
  joinRoomBtn() {
    if (!this.existingRoomId.trim() || !this.joinerName.trim()) {
      alert("Lütfen Oda ID'sini (veya linkini) ve isminizi eksiksiz girin.");
      return;
    }

    // ✨ URL TEMİZLEME MANTIĞI ✨ (Mevcut mantığın aynen korunuyor)
    let idToUse = this.existingRoomId.trim();

    // Kullanıcı tam link yapıştırdıysa, sadece sonundaki ID'yi çekiyoruz
    if (idToUse.includes('/room/')) {
      idToUse = idToUse.split('/room/')[1];
    } else if (idToUse.includes('/poker-table/')) {
      idToUse = idToUse.split('/poker-table/')[1];
    }

    // Linkin sonunda slash (/) veya parametre (?) kalmışsa onları da temizleyelim
    idToUse = idToUse.split('?')[0];
    idToUse = idToUse.split('/')[0];

    // Temizlenmiş ID ile asıl işlemi başlat
    this.executeJoin(idToUse, this.joinerName, this.joinerRole);
  }

  // Odaya katılma mantığını yürüten ana metod
  private executeJoin(roomId: string, name: string, role: number) {
    const request = { roomId: roomId, userName: name, role: role };
    
    console.log("Katılım isteği gönderiliyor (Temizlenmiş ID):", request);

    this.pokerService.joinRoom(request).subscribe({
      next: (userResponse) => {
        // Backend'den gelen kullanıcı bilgilerini tarayıcıya kaydediyoruz
        sessionStorage.setItem('userId', userResponse.id);
        sessionStorage.setItem('userName', userResponse.name);
        sessionStorage.setItem('userRole', userResponse.role.toString());

        // Başarılı katılım sonrası oylama masasına yönlendiriyoruz
        this.router.navigate(['/room', roomId]);
      },
      error: (err) => {
        console.error("Katılma hatası:", err);
        alert("Odaya katılırken bir sorun oluştu. Lütfen geçerli bir Oda Linki veya ID'si girdiğinizden emin olun.");
      }
    });
  }
}