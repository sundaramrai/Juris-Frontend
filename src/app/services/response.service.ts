// src/app/services/response.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject, timer } from 'rxjs';
import { catchError, map, tap, retry } from 'rxjs/operators';
import { Message, MessageResponse, ChatInfo } from '../Interface';
import { environment } from '../../environments/environment';

const API_URL = environment.apiUrl;

@Injectable({
  providedIn: 'root'
})
export class ResponseService {
  private currentChatIdSubject = new BehaviorSubject<string | null>(null);
  currentChatId$ = this.currentChatIdSubject.asObservable();

  constructor(private http: HttpClient) { }

  private getUserId(): string | null {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user).id : null;
  }

  setCurrentChatId(chatId: string | null): void {
    this.currentChatIdSubject.next(chatId);
  }

  getCurrentChatId(): string | null {
    return this.currentChatIdSubject.getValue();
  }

  getAllChats(page: number = 1): Observable<{ chats: ChatInfo[], pagination: { hasMore: boolean } }> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.get<{ chats: ChatInfo[], pagination: { hasMore: boolean } }>(`${API_URL}/chat/all?page=${page}`).pipe(
      retry({
        count: 3,
        delay: (error, retryCount) => {
          const delay = retryCount * 1000;
          console.log(`Retrying after ${delay}ms... (attempt ${retryCount})`);
          return timer(delay);
        }
      }),
      catchError(this.handleError)
    );
  }

  createNewChat(): Observable<{ chatId: string, title: string }> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.post<{ chatId: string, title: string }>(`${API_URL}/chat/new`, {}).pipe(
      tap(response => {
        this.setCurrentChatId(response.chatId);
      }),
      catchError(error => {
        console.error('Error creating new chat:', error);
        return throwError(() => error);
      })
    );
  }

  getChatHistory(chatId: string): Observable<{ messages: Message[], chatSummary: string, title: string }> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.get<{ chatId: string, messages: MessageResponse[], chatSummary: string, title: string }>(
      `${API_URL}/chat/history/${chatId}`
    ).pipe(
      map(response => ({
        messages: response.messages.map(msg => ({
          type: msg.type,
          text: msg.text,
          time: new Date(msg.time).toISOString()
        })),
        chatSummary: response.chatSummary || "",
        title: response.title || "New Chat"
      })),
      catchError(error => {
        console.error('Error fetching chat history:', error);
        return throwError(() => error);
      })
    );
  }

  sendMessage(message: string, chatId?: string): Observable<{ chatId: string, botResponse: string, title: string }> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.post<{ chatId: string, userMessage: string, botResponse: string, title: string }>(
      `${API_URL}/chat`,
      { message, chatId: chatId || this.getCurrentChatId() }
    ).pipe(
      tap(response => {
        if (response.chatId) {
          this.setCurrentChatId(response.chatId);
        }
      }),
      map(response => ({
        chatId: response.chatId,
        botResponse: response.botResponse,
        title: response.title
      })),
      catchError(error => {
        console.error('Error sending message:', error);
        return throwError(() => error);
      })
    );
  }

  clearChat(chatId: string): Observable<{ message: string }> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.delete<{ message: string }>(`${API_URL}/chat/history/${chatId}`).pipe(
      catchError(error => {
        console.error('Error clearing chat:', error);
        return throwError(() => error);
      })
    );
  }

  updateChatTitle(chatId: string, title: string): Observable<{ chatId: string, title: string }> {
    const userId = this.getUserId();
    if (!userId) {
      return throwError(() => new Error('User not authenticated'));
    }

    return this.http.patch<{ chatId: string, title: string }>(
      `${API_URL}/chat/title/${chatId}`,
      { title }
    ).pipe(
      catchError(error => {
        console.error('Error updating chat title:', error);
        return throwError(() => error);
      })
    );
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status) {
      errorMessage = `Error Code: ${error.status}, Message: ${error.message}`;
    }

    console.error('API Error:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
