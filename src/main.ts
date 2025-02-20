import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import loader from '@monaco-editor/loader';
import { supabase, executeWithRetry } from './supabase';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule,FormsModule],
  template: `
    <div class="editor-container">
      <div class="toolbar">
        <button (click)="shareCode()" [disabled]="loading">Share Code</button>
        <button (click)="copyLink()" *ngIf="shareId">Copy Link</button>
        <span *ngIf="loading">Saving...</span>
        <span *ngIf="error" style="color: #ff4444;">{{error}}</span>
      </div>
      <div #editorContainer class="editor"></div>
    </div>
  `,
})
export class App implements OnInit {
  @ViewChild('editorContainer', { static: true }) editorContainer!: ElementRef;
  private editor: any;
  shareId: string = '';
  loading: boolean = false;
  error: string = '';
snippetText: any;

  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('share');
    if (sharedId) {
      this.shareId = sharedId;
      this.loadSharedCode(sharedId);
    }
  }

  async ngOnInit() {
    try {
      const monaco = await loader.init();
      
      this.editor = monaco.editor.create(this.editorContainer.nativeElement, {
        value: '// Start coding here...',
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
      });
    } catch (error) {
      console.error('Error initializing editor:', error);
      this.error = 'Failed to initialize editor';
    }
  }

  async shareCode() {
    if (this.loading) return;
    
    this.loading = true;
    this.error = '';
    
    try {
      const code = this.editor.getValue();
      
      const result = await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('code_snippets')
          .insert([{ 
            code,
            language: 'javascript'
          }])
          .select()
          .single();

        if (error) throw error;
        return data;
      });

      this.shareId = result.id;
      alert('Code shared successfully!');
    } catch (error: any) {
      console.error('Error sharing code:', error);
      this.error = 'Failed to share code. Please try again.';
    } finally {
      this.loading = false;
    }
  }

  async loadSharedCode(id: string) {
    if (!id) return;
    
    this.loading = true;
    this.error = '';
    
    try {
      const result = await executeWithRetry(async () => {
        const { data, error } = await supabase
          .from('code_snippets')
          .select('code')
          .eq('id', id)
          .single();

        if (error) throw error;
        return data;
      });

      if (result) {
        // Wait for editor to be ready
        const waitForEditor = async () => {
          if (!this.editor) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return waitForEditor();
          }
          return this.editor;
        };

        const editor = await waitForEditor();
        editor.setValue(result.code);
      }
    } catch (error: any) {
      console.error('Error loading code:', error);
      this.error = 'Failed to load shared code';
    } finally {
      this.loading = false;
    }
  }

  copyLink() {
    const link = `${window.location.origin}?share=${this.shareId}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  }
}

bootstrapApplication(App);