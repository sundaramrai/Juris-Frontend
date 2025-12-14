import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, finalize } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private logoutTimer: any;

  constructor(private http: HttpClient, private router: Router) {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      this.currentUserSubject.next(JSON.parse(user));
    }
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${API_URL}/register`, userData);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${API_URL}/login`, credentials).pipe(
      tap((response: any) => {
        localStorage.setItem('token', response.token);
        localStorage.setItem('user', JSON.stringify(response.user));
        localStorage.setItem('loginTimestamp', Date.now().toString());
        this.currentUserSubject.next(response.user);
        this.setLogoutTimer();
      })
    );
  }

  logout(): Observable<any> {
    return this.http.post(`${API_URL}/logout`, {}).pipe(
      finalize(() => this.clearSession())
    );
  }

  private clearSession(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/home']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  get loggedInUser(): string | null {
    return localStorage.getItem('loggedInUser');
  }

  private setLogoutTimer(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }
    this.logoutTimer = setTimeout(() => {
      this.logout().subscribe();
    }, TWELVE_HOURS_MS);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
