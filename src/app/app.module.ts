// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { HomeComponent } from './components/home/home.component';
import { ChatbotComponent } from './components/chatbot/chatbot.component';
import { RecentChatsComponent } from './components/recent-chats/recent-chats.component';
import { ChatOptionsComponent } from './components/chat-options/chat-options.component';
import { AiAssistantComponent } from './components/ai-assistant/ai-assistant.component';
import { FeedbackComponent } from './components/feedback/feedback.component';
import { NotFoundComponent } from './components/not-found/not-found.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    ChatbotComponent,
    RecentChatsComponent,
    ChatOptionsComponent,
    AiAssistantComponent,
    FeedbackComponent,
    NotFoundComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule, // Add CommonModule to imports
    HttpClientModule,
    BrowserAnimationsModule,
    MatIconModule,
    MatMenuModule,
  ],
  providers: [
    { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
    provideAnimationsAsync()
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
