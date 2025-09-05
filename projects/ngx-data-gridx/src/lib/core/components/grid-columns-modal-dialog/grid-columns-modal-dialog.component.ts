import {Component, inject, OnInit, signal, WritableSignal} from '@angular/core';
import {MatIcon} from '@angular/material/icon';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogClose, MatDialogRef} from '@angular/material/dialog';
import {MatTooltip} from '@angular/material/tooltip';
import {GridProperty, GridPropertyType} from '../../entity/grid-property';
import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
  transferArrayItem
} from '@angular/cdk/drag-drop';
import {animate, query, stagger, style, transition, trigger} from '@angular/animations';

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
  animations: [
    trigger('flyFromLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-24px) scale(.98)' }),
        animate('180ms cubic-bezier(.2,.8,.2,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ]),
    trigger('flyFromRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(24px) scale(.98)' }),
        animate('180ms cubic-bezier(.2,.8,.2,1)', style({ opacity: 1, transform: 'none' }))
      ])
    ]),
    trigger('staggerList', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(-6px)' }),
          stagger(40, animate('150ms cubic-bezier(.2,.8,.2,1)', style({ opacity: 1, transform: 'none' })))
        ], { optional: true })
      ])
    ])
  ],
  templateUrl: './grid-columns-modal-dialog.component.html',
  styleUrl: './grid-columns-modal-dialog.component.scss'
})
export class GridColumnsModalDialogComponent implements OnInit{
  private data = inject(MAT_DIALOG_DATA);

  active: WritableSignal<GridProperty[]> = signal<GridProperty[]>([]);
  inactive: WritableSignal<GridProperty[]> = signal<GridProperty[]>([]);
  storageKey = signal<string>('');
  massMove = signal(false);

  canEnterInactive = (drag: CdkDrag<GridProperty>) => {
    const item = drag.data as GridProperty;
    return item.type !== GridPropertyType.Actions;
  };


  constructor(
    public dialogRef: MatDialogRef<GridColumnsModalDialogComponent>
  ) {
  }

  ngOnInit(): void {
    this.storageKey.set(this.data.storageKey);
    if ('active' in this.data && 'inactive' in this.data) {
      this.active = this.data.active;
      this.inactive = this.data.inactive;
    } else if ('columns' in this.data) {
      const all = this.data.columns() as GridProperty[];
      this.active.set(all.filter(c => c.visible !== false));
      this.inactive.set(all.filter(c => c.visible === false));
    }

    this.restoreData();
  }

  restoreData(){
    try {
      const item = localStorage.getItem(this.storageKey());
      if(!item){
        return;
      }

      const data = JSON.parse(item)?.columns as GridProperty[];

      this.inactive.set(data.filter(c => c.visible === false));
      this.active.set(data.filter(c => c.visible !== false));
    } catch (e){
      console.error(e);
    }

    return this;
  }

  onDropActive(event: CdkDragDrop<GridProperty[]>) {
    this.handleDrop(event, this.active, this.inactive);
  }

  onDropInactive(event: CdkDragDrop<GridProperty[]>) {
    const item = event.item.data as GridProperty;
    if (item.type === GridPropertyType.Actions) {
      return;
    }

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

  onSaveSettings(){
    const key = this.storageKey();
    if (!key) return;
    const columns: GridProperty[] = [];

    this.active().forEach((c: GridProperty, i: number) => {
      c.visible = true;
      c.columnIndex = i;
      columns.push(c);
    });

    this.inactive().forEach((c: GridProperty) => {
      c.visible = false;
      columns.push(c);
    });

    this.dialogRef.close([...columns]);

    const prevRaw = localStorage.getItem(key);
    const prev    = prevRaw ? JSON.parse(prevRaw) : {};
    const next    = { ...prev, columns };
    localStorage.setItem(key, JSON.stringify(next));
  }

  setAllColumnsActive() {
    this.massMove.set(true);
    const active = [...this.active()];
    const inactive = [...this.inactive()];

    const seen = new Set(active.map(c => c.name));
    const appended = inactive.filter(c => !seen.has(c.name));

    this.active.set([...active, ...appended]);
    this.inactive.set([]);
    setTimeout(() => this.massMove.set(false), 240);

    return this;
  }

  setAllColumnsInactive() {
    this.massMove.set(true);
    const active = [...this.active()];
    const inactive = [...this.inactive()];

    const cannotHide = active.filter(c => c.type === GridPropertyType.Actions);
    const canHide    = active.filter(c => c.type !== GridPropertyType.Actions);

    const seen = new Set(inactive.map(c => c.name));
    const mergedInactive = [...inactive, ...canHide.filter(c => !seen.has(c.name))];

    this.active.set(cannotHide);
    this.inactive.set(mergedInactive);

    setTimeout(() => this.massMove.set(false), 240);
    return this;
  }


  protected readonly GridPropertyType = GridPropertyType;
}

