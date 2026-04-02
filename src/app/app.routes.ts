import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing';
import { CreateRoomComponent } from './components/create-room/create-room'; // Birazdan oluşturacağız
import { JoinRoom } from './components/join-room/join-room'; // Sınıf isminle tam uyumlu
import { PokerTable } from './components/poker-table/poker-table';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'create', component: CreateRoomComponent },
  { path: 'join', component: JoinRoom }, 
  { path: 'room/:id', component: PokerTable }
  
];