import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Message, MessageResponse } from '../Interface';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ResponseService {
  constructor(private http: HttpClient) {}

  // Get user ID from localStorage
  private getUserId(): string | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).id : null;
  }

  // Fetch chat history for the logged-in user
  getMessages(): Observable<Message[]> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.get<{messages: MessageResponse[]}>(`${API_URL}/chat/history`).pipe(
      map(response => response.messages.map(msg => ({
        type: msg.type,
        text: msg.text,
        time: new Date(msg.time).toISOString()
      }))),
      catchError(error => {
        console.error('Error fetching messages:', error);
        return throwError(() => error);
      })
    );
  }

  getChatSummary(): Observable<string> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.get<{ messages: Message[], chatSummary: string }>(`${API_URL}/chat/history`).pipe(
      map(response => response.chatSummary || ""), // Default to empty string if undefined.
      catchError(error => {
        console.error('Error fetching chat summary:', error);
        return throwError(() => error);
      })
    );
  }


  // Send a message and get AI response
  sendMessage(message: string): Observable<Message> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.post<{userMessage: string, botResponse: string}>(`${API_URL}/chat`, { message }).pipe(
      map(response => ({
        type: 'bot' as 'bot',
        text: response.botResponse,
        time: new Date().toISOString()
      })),
      catchError(error => {
        console.error('Error sending message:', error);
        return throwError(() => error);
      })
    );
  }

  // Clear chat history for the user
  clearChat(): Observable<{message: string}> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.delete<{message: string}>(`${API_URL}/chat/history`).pipe(
      catchError(error => {
        console.error('Error clearing chat:', error);
        return throwError(() => error);
      })
    );
  }
}
