import { ApplicationRef, Component, ElementRef, OnInit, ViewChild, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { ResponseService } from '../../services/response.service';
import { Message } from '../../Interface';
import { Subscription } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { DatePipe, NgClass } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-ai-assistant',
  templateUrl: './ai-assistant.component.html',
  styleUrls: ['./ai-assistant.component.css'],
  imports: [NgClass, MatIconModule, MatTooltipModule, ReactiveFormsModule, FormsModule, DatePipe],
})
export class AiAssistantComponent implements OnInit, AfterViewInit, OnDestroy {
  messages: Message[] = [];
  userInput: string = '';
  titleJustSaved: boolean = false;
  chatTitle: string = 'New Chat';
  chatId: string | null = null;
  isLoading: boolean = false;
  isListening: boolean = false;
  isSpeaking: boolean = false;
  chatNotFound: boolean = false;
  recognition: any;
  synthesis: SpeechSynthesis | null = null;
  synthesisVoice: SpeechSynthesisVoice | null = null;
  interimTranscript: string = '';
  finalTranscript: string = '';
  confidenceThreshold: number = 0.7;
  pauseDelay: number = 2000;
  pauseTimer: any;
  showCopied: boolean = false;
  speechSynthesisUtterance: SpeechSynthesisUtterance | null = null;
  editingTitle: boolean = false;
  tempTitle: string = '';
  private routeSub: Subscription | null = null;

  @ViewChild('messagesArea') messagesArea!: ElementRef;
  @ViewChild('messageInput') messageInput!: ElementRef;
  @ViewChild('titleInput') titleInput!: ElementRef;
  private readonly responseService = inject(ResponseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly appRef = inject(ApplicationRef);

  constructor() {
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  ngOnInit(): void {
    this.routeSub = this.route.queryParams.subscribe(params => {
      const newChatId = params['chatId'];
      if (newChatId && newChatId !== this.chatId) {
        this.chatId = newChatId;
        this.responseService.setCurrentChatId(newChatId);
        this.loadChatHistory(newChatId);
      } else if (!newChatId) {
        this.responseService.setCurrentChatId(null);
        this.chatId = null;
        this.messages = [];
        this.chatTitle = 'New Chat';
        this.isLoading = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.initScrollListener();
    this.messageInput?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.stopSpeechRecognition();
    this.stopSpeechSynthesis();
    this.routeSub?.unsubscribe();
  }

  createNewChat(): void {
    this.chatId = null;
    this.messages = [];
    this.chatTitle = 'New Chat';
    this.responseService.setCurrentChatId(null);
    this.router.navigate(['/assistant'], {
      queryParams: {},
      replaceUrl: true
    });
  }

  initSpeechRecognition(): void {
    if ('webkitSpeechRecognition' in globalThis || 'SpeechRecognition' in globalThis) {
      const SpeechRecognition = (globalThis as any).SpeechRecognition ||
        (globalThis as any).webkitSpeechRecognition ||
        (globalThis as any).mozSpeechRecognition ||
        (globalThis as any).msSpeechRecognition;

      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.finalTranscript = '';
          this.interimTranscript = '';
        };

        this.recognition.onresult = (event: any) => {
          if (this.pauseTimer) {
            clearTimeout(this.pauseTimer);
          }

          this.interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence;
            if (event.results[i].isFinal) {
              if (confidence >= this.confidenceThreshold) {
                this.finalTranscript += ' ' + transcript;
                this.finalTranscript = this.finalTranscript.trim();
              }
            }
            if (!event.results[i].isFinal && confidence >= this.confidenceThreshold) {
              this.interimTranscript += transcript;
            }
          }

          this.userInput = (this.finalTranscript + ' ' + this.interimTranscript).trim();
          this.autoResizeTextarea(this.messageInput?.nativeElement);

          this.pauseTimer = this.createPauseTimer();
        };

        this.recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error !== 'no-speech') {
            this.isListening = false;
          }
        };

        this.recognition.onend = () => {
          this.isListening = false;
          this.processFinalTranscript();
        };
      }
    }
  }

  private createPauseTimer(): any {
    return globalThis.setTimeout(() => {
      this.processFinalTranscript();
      if (this.isListening) {
        this.stopSpeechRecognition();
      }
    }, this.pauseDelay);
  }

  toggleSpeechRecognition(): void {
    if (!this.recognition) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    if (this.isListening) {
      this.stopSpeechRecognition();
    } else {
      this.startSpeechRecognition();
    }
  }

  startSpeechRecognition(): void {
    if (this.isSpeaking) {
      this.stopSpeechSynthesis();
    }

    this.finalTranscript = this.userInput.trim() || '';
    this.interimTranscript = '';
    try {
      this.recognition.start();
      this.isListening = true;
    } catch (error) {
      console.error('Error starting speech recognition:', error);
      this.stopSpeechRecognition();
      requestAnimationFrame(() => {
        try {
          this.recognition.start();
          this.isListening = true;
        } catch (retryError) {
          console.error('Error on retry speech recognition:', retryError);
          this.isListening = false;
        }
      });
    }
  }

  stopSpeechRecognition(): void {
    if (this.recognition && this.isListening) {
      if (this.pauseTimer) {
        clearTimeout(this.pauseTimer);
      }
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('Error stopping speech recognition:', error);
      }
      this.isListening = false;
      this.userInput = this.finalTranscript.trim();
      this.autoResizeTextarea(this.messageInput?.nativeElement);
    }
  }

  processFinalTranscript(): void {
    let transcript = this.finalTranscript.trim();
    if (transcript && !/[.!?]$/.test(transcript)) {
      const questionWords = ['what', 'why', 'when', 'where', 'how', 'do', 'does', 'did', 'is', 'are', 'can', 'could', 'would', 'should'];
      const firstWord = transcript.split(' ')[0].toLowerCase();
      if (questionWords.includes(firstWord)) {
        transcript += '?';
      } else {
        transcript += '.';
      }
    }
    this.finalTranscript = transcript;
    this.userInput = transcript;
  }

  initSpeechSynthesis(): void {
    if ('speechSynthesis' in globalThis) {
      this.synthesis = globalThis.speechSynthesis;
      this.loadVoices();
      if (this.synthesis?.onvoiceschanged !== undefined) {
        this.synthesis.onvoiceschanged = this.loadVoices.bind(this);
      }
    }
  }

  loadVoices(): void {
    if (!this.synthesis) return;
    const voices = this.synthesis.getVoices();
    this.synthesisVoice = voices.find(voice =>
      voice.lang.includes('en-US') && voice.localService
    ) || voices.find(voice =>
      voice.lang.includes('en') && voice.localService
    ) || voices[0];

    console.log('Voice selected:', this.synthesisVoice?.name);
  }

  speakMessage(text: string): void {
    if (!this.synthesis || this.isSpeaking) return;

    if (this.isListening) {
      this.stopSpeechRecognition();
    }
    const cleanText = this.transformMarkdownLinks(text, (label) => label)
      .replaceAll(/\*\*(.+?)\*\*/g, '$1')
      .replaceAll(/\*(.+?)\*/g, '$1')
      .replaceAll(/`(.+?)`/g, '$1')
      .replaceAll(/```[\s\S]*?```/g, '')
      .replaceAll(/https?:\/\/[^\s]+/g, 'link');

    this.speechSynthesisUtterance = new SpeechSynthesisUtterance(cleanText);

    if (this.synthesisVoice) {
      this.speechSynthesisUtterance.voice = this.synthesisVoice;
    }

    this.speechSynthesisUtterance.rate = 1;
    this.speechSynthesisUtterance.pitch = 1;
    this.speechSynthesisUtterance.volume = 1;

    this.speechSynthesisUtterance.onstart = () => {
      this.isSpeaking = true;
    };

    this.speechSynthesisUtterance.onend = () => {
      this.isSpeaking = false;
    };

    this.speechSynthesisUtterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      this.isSpeaking = false;
    };

    this.synthesis.speak(this.speechSynthesisUtterance);
  }

  stopSpeechSynthesis(): void {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.cancel();
      this.isSpeaking = false;
    }
  }

  autoResizeTextarea(textarea: HTMLTextAreaElement): void {
    if (!textarea) return;
    textarea.style.height = 'auto';
    const newHeight = Math.min(150, textarea.scrollHeight);
    textarea.style.height = `${newHeight}px`;
  }

  adjustConfidence(value: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, value));
  }

  parseMessage(text: string): string {
    const cleanedText = this.cleanTextLines(text);
    const sectionNames = [
      "Title",
      "Summary",
      "Relevant Legal Provisions",
      "Analysis",
      "Real life incidents",
      "Conclusion",
      "References"
    ];

    const sections = this.extractSections(cleanedText, sectionNames);

    if (Object.keys(sections).length > 0) {
      return this.formatSectionsHtml(sections);
    } else {
      return this.formatFallbackHtml(text);
    }
  }

  private cleanTextLines(text: string): string {
    return text
      .split('\n')
      .map(line => line.trim())
      .join('\n');
  }

  private extractSections(text: string, sectionNames: string[]): { [key: string]: string } {
    const headerRegex = new RegExp(String.raw`^(${sectionNames.join('|')})\s*:\s*(.*)$`, 'i');
    const lines = text.split('\n');
    let sections: { [key: string]: string } = {};
    let currentSection = "";

    for (const line of lines) {
      const trimmedLine = line.trim();
      const headerMatch = headerRegex.exec(trimmedLine);
      if (headerMatch) {
        currentSection = headerMatch[1].trim();
        sections[currentSection] = headerMatch[2].trim();
      } else if (currentSection) {
        sections[currentSection] += "\n" + trimmedLine;
      }
    }
    return sections;
  }

  private processSectionContent(content: string): string {
    const contentLines = content.split('\n').map(l => l.trim()).filter(l => l !== '');
    const hasAsterisk = contentLines.some(line => line.startsWith('*'));
    if (hasAsterisk) {
      let result = "<ol type='a'>";
      for (let line of contentLines) {
        if (line.startsWith('*')) {
          const listItem = line.replaceAll(/^\*\s*/, '');
          result += `<li>${listItem}</li>`;
        } else {
          result += `<p>${line}</p>`;
        }
      }
      result += "</ol>";
      return result;
    }
    return content;
  }

  private formatSectionsHtml(sections: { [key: string]: string }): string {
    let html = "";
    if (sections["Title"]) {
      html += `<h4>${this.processSectionContent(sections["Title"])}</h4>`;
    }
    if (sections["Summary"]) {
      html += `<p><strong>Summary:</strong> ${this.processSectionContent(sections["Summary"])}</p>`;
    }
    if (sections["Relevant Legal Provisions"]) {
      html += `<p><strong>Relevant Legal Provisions:</strong> ${this.processSectionContent(sections["Relevant Legal Provisions"])}</p>`;
    }
    if (sections["Analysis"]) {
      html += `<p><strong>Analysis:</strong> ${this.processSectionContent(sections["Analysis"])}</p>`;
    }
    if (sections["Real life incidents"]) {
      html += `<p><strong>Real life incidents:</strong> ${this.processSectionContent(sections["Real life incidents"])}</p>`;
    }
    if (sections["Conclusion"]) {
      html += `<p><strong>Conclusion:</strong> ${this.processSectionContent(sections["Conclusion"])}</p>`;
    }
    if (sections["References"]) {
      html += `<p><strong>References:</strong> ${this.processSectionContent(sections["References"])}</p>`;
    }
    return html;
  }

  private formatFallbackHtml(text: string): string {
    let formatted = text;
    formatted = this.transformMarkdownLinks(formatted, (label, url) => `<a href="${url}" target="_blank">${label}</a>`);
    formatted = formatted.replaceAll(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replaceAll(/(?<!^)\*(.+?)\*/g, '<em>$1</em>');
    formatted = this.linkifyPlainUrls(formatted);

    const fallbackLines = formatted.split('\n');
    let result = '';
    let listOpen = false;
    for (let line of fallbackLines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('*')) {
        if (!listOpen) {
          result += "<ol type='a'>";
          listOpen = true;
        }
        result += `<li>${trimmedLine.replace(/^\*\s*/, '')}</li>`;
      } else {
        if (listOpen) {
          result += "</ol>";
          listOpen = false;
        }
        if (trimmedLine) {
          result += `<p>${trimmedLine}</p>`;
        }
      }
    }
    if (listOpen) {
      result += "</ol>";
    }
    return result;
  }

  private transformMarkdownLinks(text: string, transform: (label: string, url: string) => string): string {
    let result = '';
    let index = 0;

    while (index < text.length) {
      const startLabel = text.indexOf('[', index);
      if (startLabel === -1) {
        result += text.slice(index);
        break;
      }

      const endLabel = text.indexOf(']', startLabel + 1);
      const startUrl = endLabel === -1 ? -1 : text.indexOf('(', endLabel + 1);
      const endUrl = startUrl === -1 ? -1 : text.indexOf(')', startUrl + 1);

      if (endLabel === -1 || startUrl !== endLabel + 1 || endUrl === -1) {
        result += text.slice(index, startLabel + 1);
        index = startLabel + 1;
        continue;
      }

      result += text.slice(index, startLabel);
      const label = text.slice(startLabel + 1, endLabel);
      const url = text.slice(startUrl + 1, endUrl);
      result += transform(label, url);
      index = endUrl + 1;
    }

    return result;
  }

  private linkifyPlainUrls(text: string): string {
    let result = '';
    let index = 0;

    while (index < text.length) {
      const httpIndex = text.indexOf('http://', index);
      const httpsIndex = text.indexOf('https://', index);

      let startIndex = -1;
      let scheme = '';

      if (httpIndex !== -1 && (httpsIndex === -1 || httpIndex < httpsIndex)) {
        startIndex = httpIndex;
        scheme = 'http://';
      } else if (httpsIndex !== -1) {
        startIndex = httpsIndex;
        scheme = 'https://';
      }

      if (startIndex === -1) {
        result += text.slice(index);
        break;
      }

      result += text.slice(index, startIndex);
      let endIndex = startIndex + scheme.length;

      while (endIndex < text.length) {
        const currentChar = text[endIndex];
        if (/\s/.test(currentChar) || currentChar === '<' || currentChar === '>' || currentChar === '(' || currentChar === ')') {
          break;
        }
        endIndex++;
      }

      const url = text.slice(startIndex, endIndex);
      result += `<a href="${url}" target="_blank">${url}</a>`;
      index = endIndex;
    }

    return result;
  }

  loadChatHistory(chatId: string): void {
    this.isLoading = true;
    this.chatNotFound = false;

    this.responseService.getChatHistory(chatId).subscribe({
      next: (data) => {
        this.messages = data.messages;
        this.chatTitle = data.title;
        this.scrollToBottom();
        this.isLoading = false;
        this.appRef.tick();
        if (!this.messages.length) {
          this.router.navigate(['/assistant'], {
            queryParams: {},
            replaceUrl: true
          });
        }
      },
      error: (error) => {
        console.error('Error loading chat history:', error);
        this.createNewChat();
        this.appRef.tick();
      }
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    if (this.isListening) {
      this.stopSpeechRecognition();
    }

    if (this.isSpeaking) {
      this.stopSpeechSynthesis();
    }

    const userMessage: Message = {
      type: 'user',
      text: this.userInput,
      time: new Date().toISOString()
    };

    this.messages.push(userMessage);
    this.scrollToBottom();
    this.isLoading = true;
    this.appRef.tick();

    const messageText = this.userInput;
    const currentChatId = this.chatId;
    this.userInput = '';
    this.finalTranscript = '';
    this.interimTranscript = '';

    if (this.messageInput) {
      const textareaElement = this.messageInput.nativeElement;
      textareaElement.style.height = 'auto';
      textareaElement.style.height = '38px';
      requestAnimationFrame(() => {
        textareaElement.focus();
      });
    }

    this.responseService.sendMessage(messageText, currentChatId || undefined).subscribe({
      next: (response) => {
        this.messages.push({
          type: 'bot',
          text: response.botResponse,
          time: new Date().toISOString()
        });
        if (response.title && this.chatTitle !== response.title) {
          this.chatTitle = response.title;
        }

        if (response.chatId && response.chatId !== this.chatId) {
          this.chatId = response.chatId;
          this.responseService.setCurrentChatId(response.chatId);
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { chatId: response.chatId },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }

        this.scrollToBottom();
        this.appRef.tick();
      },
      error: (error) => {
        console.error('Error sending message:', error);
        this.messages.push({
          type: 'bot',
          text: 'Sorry, I encountered an error processing your request. Please try again later.',
          time: new Date().toISOString()
        });
        this.scrollToBottom();
        this.appRef.tick();
      },
      complete: () => {
        this.isLoading = false;
        this.appRef.tick();
      }
    });
  }

  copyMessage(text: string): void {
    if (text) {
      navigator.clipboard.writeText(text).then(() => {
        this.showCopied = true;
        requestAnimationFrame(() => {
          globalThis.setTimeout(() => {
            this.showCopied = false;
          }, 1000);
        });
      }, (error) => {
        console.error('Error copying message to clipboard:', error);
      });
    }
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  clearChat(): void {
    if (!this.chatId) return;
    const confirmed = globalThis.confirm('Are you sure you want to clear this chat? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    this.isLoading = true;
    this.responseService.clearChat(this.chatId).subscribe({
      next: () => {
        this.createNewChat();
      },
      error: (error) => {
        console.error('Error clearing chat history:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  scrollToBottom(): void {
    requestAnimationFrame(() => {
      if (this.messagesArea) {
        const element = this.messagesArea.nativeElement;
        requestAnimationFrame(() => {
          element.scrollTop = element.scrollHeight;
        });
      }
    });
  }

  initScrollListener(): void {
    if (this.messagesArea) {
      const element = this.messagesArea.nativeElement;
      element.addEventListener('scroll', () => {
        if (element.scrollTop + element.clientHeight >= element.scrollHeight) {
          this.scrollToBottom();
        }
      });
    }
  }

  startEditingTitle(): void {
    this.editingTitle = true;
    this.tempTitle = this.chatTitle;
    requestAnimationFrame(() => {
      this.titleInput?.nativeElement.focus();
    });
  }

  saveChatTitle(): void {
    if (!this.chatId) return;

    const newTitle = this.tempTitle.trim();
    if (!newTitle || newTitle === this.chatTitle) {
      this.editingTitle = false;
      return;
    }

    this.responseService.updateChatTitle(this.chatId, newTitle).subscribe({
      next: (response) => {
        this.chatTitle = response.title;
        this.editingTitle = false;
        this.titleJustSaved = true;
        globalThis.setTimeout(() => {
          this.titleJustSaved = false;
        }, 1500);
      },
      error: (error) => {
        console.error('Error updating chat title:', error);
        this.editingTitle = false;
      }
    });
  }

  cancelEditTitle(): void {
    this.editingTitle = false;
  }

  handleTitleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.saveChatTitle();
    } else if (event.key === 'Escape') {
      this.cancelEditTitle();
    }
  }
}