// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { ToolsComponent } from './components/tools/tools.component';
import { AiAssistantComponent } from './components/ai-assistant/ai-assistant.component';
import { FeedbackComponent } from './components/feedback/feedback.component';
import { NotFoundComponent } from './components/not-found/not-found.component';
import { TemplatesComponent } from './components/templates/templates.component';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  {
    path: 'tools',
    component: ToolsComponent,
    canActivate: [AuthGuard],
    children: [
      { path: 'assistant', component: AiAssistantComponent },
      { path: 'feedback', component: FeedbackComponent },
      { path: 'templates', component: TemplatesComponent },
      { path: '', redirectTo: 'assistant', pathMatch: 'full' }
    ]
  },
  { path: 'home', component: HomeComponent},
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: '**', component: NotFoundComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
