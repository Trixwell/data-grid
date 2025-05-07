import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import {MatMenuModule} from '@angular/material/menu';
import {MatButtonModule} from '@angular/material/button';

@Component({
  selector: 'app-audio-player',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule
  ],
  templateUrl: './audio-player.component.html',
  styleUrl: './audio-player.component.scss'
})
export class AudioPlayerComponent {
  @Input() src: string | null = null;

  @ViewChild('audio') audioRef!: ElementRef<HTMLAudioElement>;

  isPlaying = false;
  isMuted = false;
  volume = 1;
  progress = 0;

  private static currentPlayer: AudioPlayerComponent | null = null;

  togglePlay(): void {
    const audio = this.audioRef.nativeElement;
    if (audio.paused) {
      if (AudioPlayerComponent.currentPlayer && AudioPlayerComponent.currentPlayer !== this) {
        AudioPlayerComponent.currentPlayer.pauseAudio();
      }

      audio.play();
      this.isPlaying = true;
      AudioPlayerComponent.currentPlayer = this;
    } else {
      audio.pause();
      this.isPlaying = false;
      if (AudioPlayerComponent.currentPlayer === this) {
        AudioPlayerComponent.currentPlayer = null;
      }
    }
  }

  pauseAudio(): void {
    const audio = this.audioRef.nativeElement;
    if (!audio.paused) {
      audio.pause();
      this.isPlaying = false;
    }
  }

  updateProgress(): void {
    const audio = this.audioRef.nativeElement;
    if (audio.duration) {
      this.progress = (audio.currentTime / audio.duration) * 100;
    }
  }

  seekAudio(event: MouseEvent): void {
    const progressBar = event.currentTarget as HTMLElement;
    const rect = progressBar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const width = rect.width;
    const clickPercent = clickX / width;
    const audio = this.audioRef.nativeElement;
    if (audio.duration) {
      audio.currentTime = clickPercent * audio.duration;
    }
  }

  changeVolume(event: Event): void {
    const input = event.target as HTMLInputElement;
    const vol = parseFloat(input.value);
    this.volume = vol;
    const audio = this.audioRef.nativeElement;
    audio.volume = vol;
    this.isMuted = vol === 0;
  }

  toggleMute(): void {
    const audio = this.audioRef.nativeElement;
    audio.muted = !audio.muted;
    this.isMuted = audio.muted;
  }

  onAudioEnded(): void {
    this.isPlaying = false;
    this.progress = 0;
    if (AudioPlayerComponent.currentPlayer === this) {
      AudioPlayerComponent.currentPlayer = null;
    }
  }
}
