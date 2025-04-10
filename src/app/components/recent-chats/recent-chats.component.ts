// src/app/components/recent-chats/recent-chats.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ResponseService } from '../../services/response.service';
import { ChatInfo } from '../../Interface';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-recent-chats',
  standalone: false,
  templateUrl: './recent-chats.component.html',
  styleUrl: './recent-chats.component.css'
})
export class RecentChatsComponent implements OnInit, OnDestroy {
  chats: ChatInfo[] = [];
  isLoading: boolean = false;
  currentChatId: string | null = null;
  loadingError: boolean = false;
  errorMessage: string = '';
  currentPage: number = 1;
  hasMoreChats: boolean = false;
  private chatIdSubscription: Subscription | null = null;

  constructor(
    private responseService: ResponseService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadAllChats();
    this.chatIdSubscription = this.responseService.currentChatId$.subscribe(chatId => {
      this.currentChatId = chatId;
    });
  }

  ngOnDestroy(): void {
    if (this.chatIdSubscription) {
      this.chatIdSubscription.unsubscribe();
    }
  }

  get chatsWithMessages(): ChatInfo[] {
    return this.chats.filter(chat => chat.messageCount && chat.messageCount > 0);
  }

  loadAllChats(refresh: boolean = true): void {
    this.isLoading = true;
    this.loadingError = false;

    if (refresh) {
      this.currentPage = 1;
      this.chats = [];
    }

    this.responseService.getAllChats(this.currentPage).subscribe({
      next: (response) => {
        if (refresh) {
          this.chats = response.chats;
        } else {
          this.chats = [...this.chats, ...response.chats];
        }
        this.hasMoreChats = response.pagination.hasMore;
        this.currentPage++;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading chats:', error);
        this.loadingError = true;
        this.errorMessage = error.message || 'Failed to load chats. Please try again.';
        this.isLoading = false;
      }
    });
  }

  loadMoreChats(): void {
    if (this.hasMoreChats && !this.isLoading) {
      this.loadAllChats(false);
    }
  }

  refreshChats(): void {
    this.loadAllChats(true);
  }

  openChat(chatId: string): void {
    const chatExists = this.chats.some(chat => chat.chatId === chatId);

    if (chatExists) {
      this.responseService.setCurrentChatId(chatId);
      this.router.navigate(['/tools/assistant'], { queryParams: { chatId } });
    } else {
      this.createNewChat();
    }
  }

  createNewChat(): void {
    this.responseService.createNewChat().subscribe({
      next: (response) => {
        this.router.navigate(['/tools/assistant'], { queryParams: { chatId: response.chatId } });
        setTimeout(() => this.loadAllChats(), 500);
      },
      error: (error) => {
        console.error('Error creating new chat:', error);
      }
    });
  }
}
