import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PlanningPokerService } from '../../services/planning-poker';

@Component({
  selector: 'app-create-room',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './create-room.html'
})
export class CreateRoomComponent {
  newRoomName = '';
  creatorName = '';
  creatorRole = 1; // Scrum Master

  constructor(private pokerService: PlanningPokerService, private router: Router) {}

  createAndJoinRoom() {
    if (!this.newRoomName || !this.creatorName) {
      alert("Lütfen oda adını ve isminizi girin.");
      return;
    }

    this.pokerService.createRoom(this.newRoomName).subscribe({
      next: (response) => {
        const roomId = response.roomId || response.id;
        if (roomId) {
          this.joinExistingRoom(roomId, this.creatorName, this.creatorRole);
        }
      },
      error: (err) => console.error("Hata:", err)
    });
  }

  private joinExistingRoom(roomId: string, name: string, role: number) {
    const request = { roomId, userName: name, role };
    this.pokerService.joinRoom(request).subscribe({
      next: (userResponse) => {
        sessionStorage.setItem('userId', userResponse.id);
        sessionStorage.setItem('userName', userResponse.name);
        sessionStorage.setItem('userRole', userResponse.role.toString());
        this.router.navigate(['/room', roomId]);
      }
    });
  }
}