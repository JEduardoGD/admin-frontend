import {
  Component,
  DestroyRef,
  ElementRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';

interface BootstrapModal {
  show(): void;
  hide(): void;
}

interface BootstrapGlobal {
  Modal?: new (element: HTMLElement) => BootstrapModal;
}

@Component({
  selector: 'app-camera-capture',
  templateUrl: './camera-capture.html',
  styleUrl: './camera-capture.css',
})
export class CameraCapture {
  private readonly destroyRef = inject(DestroyRef);
  private readonly modalEl = viewChild.required<ElementRef<HTMLElement>>('cameraModal');
  private readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('cameraVideo');

  private modal?: BootstrapModal;
  private stream?: MediaStream;
  private eventsWired = false;

  readonly photoCaptured = output<File>();

  readonly devices = signal<MediaDeviceInfo[]>([]);
  readonly selectedDeviceId = signal<string | null>(null);
  readonly starting = signal(false);
  readonly streamReady = signal(false);
  readonly cameraError = signal<string | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.stopStream());
  }

  open(): void {
    this.cameraError.set(null);
    this.wireEvents();
    this.getModal()?.show();
  }

  close(): void {
    this.modal?.hide();
  }

  capture(): void {
    const video = this.videoEl()?.nativeElement;
    if (!video || !this.streamReady()) {
      this.cameraError.set('La cámara aún no está lista.');
      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!width || !height) {
      this.cameraError.set('La cámara aún no está lista.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      this.cameraError.set('No se pudo procesar la imagen.');
      return;
    }
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          this.cameraError.set('No se pudo capturar la foto.');
          return;
        }
        const file = new File([blob], `foto-personal-${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        this.close();
        this.photoCaptured.emit(file);
      },
      'image/jpeg',
      0.92,
    );
  }

  onDeviceChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const deviceId = select.value;
    if (!deviceId || deviceId === this.selectedDeviceId()) {
      return;
    }
    this.selectedDeviceId.set(deviceId);
    void this.startCamera();
  }

  private wireEvents(): void {
    if (this.eventsWired) {
      return;
    }
    const element = this.modalEl().nativeElement;
    element.addEventListener('shown.bs.modal', () => void this.startCamera());
    element.addEventListener('hidden.bs.modal', () => this.stopStream());
    this.eventsWired = true;
  }

  private getModal(): BootstrapModal | undefined {
    if (this.modal) {
      return this.modal;
    }
    const bootstrap = (window as unknown as { bootstrap?: BootstrapGlobal }).bootstrap;
    if (!bootstrap?.Modal) {
      this.cameraError.set('No se pudo inicializar la ventana de la cámara.');
      return undefined;
    }
    this.modal = new bootstrap.Modal(this.modalEl().nativeElement);
    return this.modal;
  }

  private async startCamera(): Promise<void> {
    this.cameraError.set(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      this.cameraError.set('Este navegador no permite acceder a la cámara.');
      return;
    }

    this.starting.set(true);
    this.stopStream();
    try {
      const video: MediaTrackConstraints = this.selectedDeviceId()
        ? { deviceId: { exact: this.selectedDeviceId() as string } }
        : { facingMode: 'user' };
      this.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false });
      const element = this.videoEl()?.nativeElement;
      if (element) {
        element.srcObject = this.stream;
        await element.play().catch(() => undefined);
      }
      this.streamReady.set(true);
      await this.loadDevices();
    } catch {
      this.streamReady.set(false);
      this.cameraError.set('No se pudo acceder a la cámara. Verifica los permisos.');
    } finally {
      this.starting.set(false);
    }
  }

  private async loadDevices(): Promise<void> {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list.filter((device) => device.kind === 'videoinput');
      this.devices.set(cams);
      if (!this.selectedDeviceId() && cams.length > 0) {
        this.selectedDeviceId.set(cams[0].deviceId);
      }
    } catch {
      this.devices.set([]);
    }
  }

  private stopStream(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    const element = this.videoEl()?.nativeElement;
    if (element) {
      element.srcObject = null;
    }
    this.streamReady.set(false);
  }
}
