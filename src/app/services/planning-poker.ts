import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as signalR from '@microsoft/signalr';
import { Subject, Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment'; // 👈 Zincirler kırıldı, Environment aktif!

@Injectable({
  providedIn: 'root'
})
export class PlanningPokerService {

  // ✨ Canlı ve Lokal ayrımı: Adresleri doğrudan aktif environment dosyasından çekiyoruz
  private apiUrl = environment.apiUrl;
  private hubUrl = environment.hubUrl;
  
  private hubConnection!: signalR.HubConnection;

  // Hoparlörlerimiz
  public userUpdated$ = new Subject<void>();
  public votesRevealed$ = new Subject<void>();
  public votesCleared$ = new Subject<void>();
  public taskChanged$ = new Subject<string>();

  constructor(private http: HttpClient) { }

  // ---------------------------------------------------------
  // 1. REST API İŞLEMLERİ (Hata yakalama aktif)
  // ---------------------------------------------------------

  createRoom(roomName: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/rooms/create`, { roomName }).pipe(
      catchError(this.handleError)
    );
  }

  getRoom(roomId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/rooms/${roomId}`).pipe(
      catchError(this.handleError)
    );
  }

  joinRoom(data: { roomId: string, userName: string, role: number }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/join`, data).pipe(
      catchError(this.handleError)
    );
  }

  leaveRoom(roomId: string, userId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/leave/${roomId}/${userId}`).pipe(
      catchError(this.handleError)
    );
  }

  // ---------------------------------------------------------
  // 2. SIGNALR İŞLEMLERİ (Bağlantı yönetimi)
  // ---------------------------------------------------------

  public startConnection() {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return;
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR Canlı Bağlantısı Kuruldu!');
        this.setupSignalRListeners();
      })
      .catch(err => {
        console.error('❌ SignalR Bağlantı Hatası: ', err);
        setTimeout(() => this.startConnection(), 5000);
      });

    this.hubConnection.onreconnecting(err => console.warn('📡 Bağlantı koptu, yeniden deneniyor...', err));
    this.hubConnection.onreconnected(id => console.log('✅ Yeniden bağlandı. Connection ID:', id));
  }

  // ✨ YENİ: Masadan kalktığımızda bağlantıyı koparacak "Fiş Çekme" metodu (Hayalet Avcısı)
  public stopConnection() {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.stop().catch(err => console.error('Bağlantı durdurulamadı:', err));
    }
  }

  private setupSignalRListeners() {
    this.hubConnection.off('UserUpdated');
    this.hubConnection.off('VotesRevealed');
    this.hubConnection.off('VotesCleared');
    this.hubConnection.off('TaskChanged');

    this.hubConnection.on('UserUpdated', () => this.userUpdated$.next());
    this.hubConnection.on('VotesRevealed', () => this.votesRevealed$.next());
    this.hubConnection.on('VotesCleared', () => this.votesCleared$.next());
    this.hubConnection.on('TaskChanged', (newTaskName: string) => this.taskChanged$.next(newTaskName));
  }

  // ✨ GÜNCELLEME: Kusursuz yeniden bağlanma için ekstra parametreler eklendi
  public joinRoomSignalR(roomId: string, userId: string, userName: string, role: number, currentVote: string) {
    this.safeInvoke('JoinRoom', roomId, userId, userName, role, currentVote || "");
  }

  public submitVote(roomId: string, userId: string, vote: string) {
    this.safeInvoke('SubmitVote', roomId, userId, vote);
  }

  public revealVotes(roomId: string) {
    this.safeInvoke('RevealVotes', roomId);
  }

  public clearVotes(roomId: string) {
    this.safeInvoke('ClearVotes', roomId);
  }

  public addBot(roomId: string) {
    this.safeInvoke('AddBot', roomId);
  }

  public removeBots(roomId: string) {
    this.safeInvoke('RemoveBots', roomId);
  }

  public changeTask(roomId: string, newTaskName: string) {
    this.safeInvoke('ChangeTask', roomId, newTaskName);
  }

  private safeInvoke(methodName: string, ...args: any[]) {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke(methodName, ...args).catch(err => console.error(`${methodName} hatası:`, err));
    } else {
      console.warn(`${methodName} gönderilemedi, SignalR bağlı değil.`);
    }
  }

  private handleError(error: any) {
    let errorMessage = 'Bir hata oluştu!';
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Hata: ${error.error.message}`;
    } else {
      errorMessage = `Hata Kodu: ${error.status}\nMesaj: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}