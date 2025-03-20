// src/app/services/feedback.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Feedback } from '../Interface';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  constructor(private http: HttpClient) { }

  sendFeedback(feedback: Feedback): Observable<Feedback> {
    return this.http.post<Feedback>(`${API_URL}/feedback`, feedback).pipe(
      catchError(error => {
        console.error('Error sending feedback:', error);
        return throwError(() => new Error('Failed to submit feedback. Please try again.'));
      })
    );
  }
}
