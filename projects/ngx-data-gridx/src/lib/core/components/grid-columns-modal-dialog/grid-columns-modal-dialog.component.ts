import {Component, inject, OnInit, signal, WritableSignal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogClose} from '@angular/material/dialog';
import {MatTooltip} from '@angular/material/tooltip';
import {GridProperty} from '../../entity/grid-property';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'grid-columns-modal-dialog',
  imports: [
    MatIcon,
    MatIconButton,
    MatDialogClose,
    MatTooltip,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatButton
  ],
  templateUrl: './grid-columns-modal-dialog.component.html',
  styleUrl: './grid-columns-modal-dialog.component.scss'
})
export class GridColumnsModalDialogComponent implements OnInit{
  private data = inject(MAT_DIALOG_DATA);

  active: WritableSignal<GridProperty[]> = signal<GridProperty[]>([]);
  inactive: WritableSignal<GridProperty[]> = signal<GridProperty[]>([]);

  ngOnInit(): void {
    if ('active' in this.data && 'inactive' in this.data) {
      this.active = this.data.active;
      this.inactive = this.data.inactive;
    } else if ('columns' in this.data) {
      const all = this.data.columns() as GridProperty[];
      const act = all.filter(c => c.visible !== false);
      const inact = all.filter(c => c.visible === false);
      this.active.set(act);
      this.inactive.set(inact);
    }
  }

  onDropActive(event: CdkDragDrop<GridProperty[]>) {
    this.handleDrop(event, this.active, this.inactive);
  }

  onDropInactive(event: CdkDragDrop<GridProperty[]>) {
    this.handleDrop(event, this.inactive, this.active);
  }

  private handleDrop(
    event: CdkDragDrop<GridProperty[]>,
    targetSignal: WritableSignal<GridProperty[]>,
    otherSignal: WritableSignal<GridProperty[]>
  ) {
    const target = [...event.container.data];
    const source = [...event.previousContainer.data];

    if (event.previousContainer === event.container) {
      moveItemInArray(target, event.previousIndex, event.currentIndex);
      targetSignal.set(target);
    } else {
      transferArrayItem(source, target, event.previousIndex, event.currentIndex);
      targetSignal.set(target);
      otherSignal.set(source);
    }
  }
}
