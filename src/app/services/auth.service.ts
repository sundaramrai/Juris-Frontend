import { inject, Injectable } from '@angular/core';
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
  private readonly currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private logoutTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  constructor() {
    if (this.hasValidSession()) {
      this.currentUserSubject.next(this.getStoredUser());
      this.setLogoutTimer();
    } else {
      this.clearSession();
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
      finalize(() => this.clearSession('/home'))
    );
  }

  clearSession(redirectTo?: string): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
      this.logoutTimer = null;
    }
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    if (redirectTo) {
      this.router.navigate([redirectTo]);
    }
  }

  isLoggedIn(): boolean {
    const isValid = this.hasValidSession();
    if (!isValid) {
      this.clearSession();
    }
    return isValid;
  }

  get loggedInUser(): string | null {
    return this.getStoredUser()?.username || null;
  }

  private setLogoutTimer(): void {
    if (this.logoutTimer) {
      clearTimeout(this.logoutTimer);
    }

    const expiresAt = this.getTokenExpiryMs();
    if (!expiresAt) return;

    const remainingMs = expiresAt - Date.now();
    if (remainingMs <= 0) {
      this.clearSession('/login');
      return;
    }

    this.logoutTimer = setTimeout(() => {
      this.clearSession('/login');
    }, Math.min(remainingMs, TWELVE_HOURS_MS));
  }

  getToken(): string | null {
    return this.isLoggedIn() ? localStorage.getItem('token') : null;
  }

  handleUnauthorized(): void {
    this.clearSession('/login');
  }

  private hasValidSession(): boolean {
    return Boolean(localStorage.getItem('token') && this.getStoredUser() && !this.isTokenExpired());
  }

  private getStoredUser(): any {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch {
      return null;
    }
  }

  private isTokenExpired(): boolean {
    const expiresAt = this.getTokenExpiryMs();
    return !expiresAt || expiresAt <= Date.now();
  }

  private getTokenExpiryMs(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
      const payload = JSON.parse(this.decodeJwtPart(token.split('.')[1]));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private decodeJwtPart(value: string | undefined): string {
    if (!value) throw new Error('Missing JWT payload');

    const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(base64.length + ((4 - base64.length % 4) % 4), '=');
    return atob(padded);
  }
}
