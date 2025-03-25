// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

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
        this.currentUserSubject.next(response.user);
        this.setLogoutTimer();
      })
    );
  }

  logout() {
    localStorage.removeItem('loggedInUser');
    localStorage.removeItem('loginTimestamp');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  requestOTP(userData: { email: string, username: string, password: string }): Observable<any> {
    return this.http.post(`${API_URL}/register/request-otp`, userData);
  }

  verifyOTP(otpData: { email: string, otp: string }): Observable<any> {
    return this.http.post(`${API_URL}/register/verify-otp`, otpData);
  }

  get loggedInUser(): string | null {
    return localStorage.getItem('loggedInUser');
  }

  private setLogoutTimer() {
    setTimeout(() => {
      this.logout();
    }, 12 * 60 * 60 * 1000);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
