import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule], // RouterModule butona routerLink vermek için şart!
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class LandingComponent {
  // Buraya şimdilik ekstra bir kod yazmamıza gerek yok, 
  // çünkü bu sayfa sadece yönlendirme (navigasyon) yapacak.
}