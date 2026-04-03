import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing/landing';
import { CreateRoomComponent } from './components/create-room/create-room';
import { JoinRoom } from './components/join-room/join-room';
import { PokerTable } from './components/poker-table/poker-table';

export const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'create', component: CreateRoomComponent },
  
  // 1. Normal Giriş: (Örn: menüden join'e basınca)
  { path: 'join', component: JoinRoom }, 
  
  // 2. Linkle Giriş: (PokerTable'dan yönlendirilince ID'yi yakalamak için ŞART)
  { path: 'join/:id', component: JoinRoom }, 

  { path: 'room/:id', component: PokerTable },
  
  // (Opsiyonel) Yanlış link yazılırsa ana sayfaya at:
  { path: '**', redirectTo: '' }
];