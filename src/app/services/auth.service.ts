// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
// import { environment } from '../../environments/environment.prod';

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
    localStorage.removeItem('loggedInUser'); // Remove user info
    localStorage.removeItem('loginTimestamp'); // Remove timestamp
    localStorage.removeItem('token'); // Remove JWT token
    this.currentUserSubject.next(null); // Set current user to null
    this.router.navigate(['/login']); // Redirect to login page
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token'); // Check if token exists
  }

  get loggedInUser(): string | null {
    return localStorage.getItem('loggedInUser'); // Retrieve logged-in user
  }

  private setLogoutTimer() {
    setTimeout(() => {
      this.logout();
    }, 12 * 60 * 60 * 1000); // 12 hours
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
