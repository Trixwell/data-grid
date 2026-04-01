import {
  Directive,
  OnInit,
  OnDestroy,
  Renderer2,
  ElementRef,
  Inject, input,
} from "@angular/core";
import { DOCUMENT } from "@angular/common";

/**
 * Column resize handle. mat-sort-header listens to (click) on &lt;th&gt;; the synthetic click
 * after resize must be stopped in the capture phase on document. The listener must be added
 * synchronously when the user presses the handle (before mouseup), not in setTimeout(0).
 */
@Directive({
  selector: "[resizeColumn]",
})
export class ResizeColumnDirective implements OnInit, OnDestroy {
  /** Must match template binding name `[resizeColumn]`. */
  resizeColumn = input<boolean>(false);

  index = input<number>(0);

  private startX = 0;

  private startWidth = 0;

  private readonly column: HTMLElement;

  private resizerEl: HTMLElement | null = null;

  private table!: HTMLElement;

  private pressed = false;

  private activePointerId: number | null = null;

  private unlistenPointerDown?: () => void;

  private unlistenResizerClick?: () => void;

  private pendingClickSuppress: ((event: Event) => void) | null = null;

  private suppressFallbackTimer: ReturnType<typeof setTimeout> | null = null;

  private unlistenMove?: () => void;

  private unlistenUp?: () => void;

  private unlistenCancel?: () => void;

  constructor(
    private renderer: Renderer2,
    private el: ElementRef<HTMLElement>,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.column = this.el.nativeElement;
  }

  ngOnInit() {
    if (!this.resizeColumn()) {
      return;
    }

    this.table = this.column.closest("table") as HTMLElement;
    if (!this.table) {
      return;
    }

    const resizer = this.renderer.createElement("span");
    this.resizerEl = resizer;
    this.renderer.addClass(resizer, "resize-holder");
    this.renderer.setAttribute(resizer, "role", "separator");
    this.renderer.setAttribute(resizer, "aria-orientation", "vertical");
    this.renderer.setAttribute(resizer, "aria-hidden", "true");
    this.renderer.setStyle(resizer, "position", "absolute");
    this.renderer.setStyle(resizer, "right", "0");
    this.renderer.setStyle(resizer, "top", "0");
    this.renderer.setStyle(resizer, "bottom", "0");
    this.renderer.setStyle(resizer, "width", "12px");
    this.renderer.setStyle(resizer, "cursor", "col-resize");
    this.renderer.setStyle(resizer, "z-index", "50");
    this.renderer.setStyle(resizer, "touch-action", "none");
    this.renderer.setStyle(resizer, "box-sizing", "border-box");
    this.renderer.appendChild(this.column, resizer);

    this.unlistenPointerDown = this.renderer.listen(
      resizer,
      "pointerdown",
      this.onPointerDown
    );

    this.unlistenResizerClick = this.renderer.listen(
      resizer,
      "click",
      this.onResizerClick
    );
  }

  private readonly onResizerClick = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  private readonly onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.armNextClickSortSuppress();

    this.activePointerId = event.pointerId;
    try {
      (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    } catch {
      this.activePointerId = null;
    }

    this.pressed = true;
    this.startX = event.pageX;
    this.startWidth = this.column.offsetWidth;
    this.renderer.addClass(this.table, "resizing");
    this.renderer.addClass(this.table, "grid__table--col-resize");

    this.clearDocumentListeners();
    this.unlistenMove = this.renderer.listen(
      this.document,
      "pointermove",
      this.onPointerMove as (e: Event) => boolean | void
    );
    this.unlistenUp = this.renderer.listen(
      this.document,
      "pointerup",
      this.onPointerUp as (e: Event) => boolean | void
    );
    this.unlistenCancel = this.renderer.listen(
      this.document,
      "pointercancel",
      this.onPointerCancel as (e: Event) => boolean | void
    );
  };

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.pressed) {
      return;
    }
    if (this.activePointerId != null && event.pointerId !== this.activePointerId) {
      return;
    }
    this.applyWidth(event.pageX);
  };

  private applyWidth(pageX: number) {
    const width = Math.max(40, this.startWidth + (pageX - this.startX));
    const widthPx = `${width}px`;

    const rows = this.table.querySelectorAll(
      "tbody tr.mat-mdc-row, tbody tr[mat-row]"
    );
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td.mat-mdc-cell, td[mat-cell]");
      const cell = cells.item(this.index());
      if (cell) {
        this.renderer.setStyle(cell, "width", widthPx);
        this.renderer.setStyle(cell, "min-width", widthPx);
        this.renderer.setStyle(cell, "max-width", widthPx);
        this.renderer.setStyle(cell, "box-sizing", "border-box");
      }
    });

    this.renderer.setStyle(this.column, "width", widthPx);
    this.renderer.setStyle(this.column, "min-width", widthPx);
    this.renderer.setStyle(this.column, "max-width", widthPx);
    this.renderer.setStyle(this.column, "box-sizing", "border-box");
  }

  private readonly onPointerUp = (event: PointerEvent) => {
    if (this.activePointerId != null && event.pointerId !== this.activePointerId) {
      return;
    }
    this.finishPointerSession(event.pointerId);
  };

  private readonly onPointerCancel = (event: PointerEvent) => {
    if (this.activePointerId != null && event.pointerId !== this.activePointerId) {
      return;
    }
    this.finishPointerSession(event.pointerId);
  };

  private finishPointerSession(pointerId: number) {
    if (!this.pressed) {
      return;
    }
    this.pressed = false;
    this.renderer.removeClass(this.table, "resizing");

    if (this.resizerEl && this.activePointerId != null) {
      try {
        if (this.resizerEl.hasPointerCapture(pointerId)) {
          this.resizerEl.releasePointerCapture(pointerId);
        }
      } catch {
        /* ignore */
      }
    }
    this.activePointerId = null;

    this.clearDocumentListeners();
    this.scheduleSuppressFallbackClear();
  }

  /**
   * Must run synchronously on pointerdown, before pointerup, so it is registered when the
   * browser dispatches the follow-up click.
   */
  private getClickSuppressRoot(): EventTarget {
    return this.document.defaultView ?? this.document;
  }

  private armNextClickSortSuppress(): void {
    this.clearSuppressArm();

    const handler = (e: Event) => {
      this.clearSuppressArm();
      const target = e.target as Node | null;
      if (target && this.column.contains(target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    this.pendingClickSuppress = handler;
    this.getClickSuppressRoot().addEventListener("click", handler, {
      capture: true,
      once: true,
    });
  }

  private clearSuppressArm(): void {
    if (this.suppressFallbackTimer != null) {
      clearTimeout(this.suppressFallbackTimer);
      this.suppressFallbackTimer = null;
    }
    if (this.pendingClickSuppress) {
      this.getClickSuppressRoot().removeEventListener(
        "click",
        this.pendingClickSuppress,
        true
      );
      this.pendingClickSuppress = null;
    }
  }

  private scheduleSuppressFallbackClear(): void {
    if (this.suppressFallbackTimer != null) {
      clearTimeout(this.suppressFallbackTimer);
    }
    this.suppressFallbackTimer = setTimeout(() => {
      this.clearSuppressArm();
      this.suppressFallbackTimer = null;
    }, 800);
  }

  private clearDocumentListeners() {
    if (this.unlistenMove) {
      this.unlistenMove();
      this.unlistenMove = undefined;
    }
    if (this.unlistenUp) {
      this.unlistenUp();
      this.unlistenUp = undefined;
    }
    if (this.unlistenCancel) {
      this.unlistenCancel();
      this.unlistenCancel = undefined;
    }
  }

  ngOnDestroy() {
    this.clearSuppressArm();
    this.clearDocumentListeners();
    if (this.unlistenResizerClick) {
      this.unlistenResizerClick();
      this.unlistenResizerClick = undefined;
    }
    if (this.unlistenPointerDown) {
      this.unlistenPointerDown();
      this.unlistenPointerDown = undefined;
    }
    if (this.pressed) {
      this.pressed = false;
      this.renderer.removeClass(this.table, "resizing");
    }
  }
}
