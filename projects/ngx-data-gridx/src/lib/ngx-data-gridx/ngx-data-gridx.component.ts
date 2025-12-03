import {
  AfterViewInit, ChangeDetectorRef,
  Component, ContentChild, effect, ElementRef, HostListener, input,
  model, OnDestroy, OnInit, QueryList, TemplateRef, Type,
  ViewChild, ViewChildren, ViewContainerRef
} from '@angular/core';
import {GridProperty, GridPropertyType, MultiSearchOptions} from '../core/entity/grid-property';
import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {MatTableModule} from '@angular/material/table';
import {CommonModule} from '@angular/common';
import {MatPaginatorModule, MatPaginator} from '@angular/material/paginator';
import {MatTableDataSource} from '@angular/material/table';
import {MatSort, Sort, MatSortModule} from '@angular/material/sort';
import {MatSelectModule} from '@angular/material/select';
import {MatCheckboxModule} from '@angular/material/checkbox';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatMenuModule} from '@angular/material/menu';
import {finalize, interval, isObservable, map, Observable, of, Subject, Subscription, takeUntil} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {MatOptionSelectionChange, provideNativeDateAdapter} from '@angular/material/core';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {SelectionModel} from '@angular/cdk/collections';
import {MatProgressBarModule} from '@angular/material/progress-bar';
import {AudioPlayerComponent} from '../core/components/audio-player/audio-player.component';
import {SquarePaginatorDirective} from '../directives/square-paginator.directive';
import {InvokeBtnComponent} from '../core/components/invoke-btn/invoke-btn.component';
import {GridFooterSettingsComponent} from '../core/components/grid-footer-settings/grid-footer-settings.component';
import {GridCellHost} from '../core/components/grid-cell-host/grid-cell-host';
import {MatSlider, MatSliderRangeThumb} from '@angular/material/slider';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ngx-data-gridx',
  imports: [
    MatTableModule,
    CommonModule,
    MatPaginatorModule,
    MatSortModule,
    MatSelectModule,
    MatCheckboxModule,
    FormsModule,
    MatTooltipModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatMenuModule,
    MatFormFieldModule,
    MatDatepickerModule,
    ReactiveFormsModule,
    MatProgressBarModule,
    AudioPlayerComponent,
    SquarePaginatorDirective,
    InvokeBtnComponent,
    GridFooterSettingsComponent,
    GridCellHost,
    MatSliderRangeThumb,
    MatSlider,
    MatRadioGroup,
    MatRadioButton,
    RouterLink,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './ngx-data-gridx.component.html',
  styleUrl: './ngx-data-gridx.component.scss',
})

export class NgxDataGridx implements OnInit, AfterViewInit, OnDestroy {
  url = model<string | undefined>("");
  exportCsvUrl = model<string | undefined>();
  data = model<GridProperty[]>([]);
  limit = model<number>(10);
  sort = model<string>('asc');
  grid_name = model<string | undefined>();
  sidx = model<string | undefined>();
  multiselect = model<boolean>(false);
  showFilters = model<boolean>(true);
  subUrlParams = model<{ paramName: string; columnName: string }[] | null>();
  currentRow = model<object | null | undefined>();
  showHistoryFilters = model<boolean>(true);
  key = model<string | null>(null);
  expandedElement = model<object | null | undefined>();
  theme = input<GridTheme>(GridTheme.BROAD);
  noDataPlaceholder = input<string>(
    'Даних поки що немає, але не хвилюйтесь вони скоро з\'являться.'
  );
  parentGridFilters = input<{
    search: Record<string, string>;
    filters: Record<string, Record<string, AppliedFiltersDTO>>;
  }>({search: {}, filters: {}});
  autoRefreshIntervalSec = input<number | null>(null);
  disablePagination = input<boolean>(false);
  lazyLoad = input<boolean>(false);
  detailComponent = input<Type<any> | undefined>();
  openAllToggleDetails = input<boolean>(false);
  showPrint = input<boolean>(true);
  showColumnSettings = input<boolean>(true);
  print = input<(() => void) | null>(null);
  currentSearchType: string | null = null;

  /** detail accordion (dblclick) */
  detailExpandedElement: any | null = null;

  @ContentChild(TemplateRef) detailTemplate?: TemplateRef<any>;
  @ViewChildren('detailContainer', {read: ViewContainerRef})
  detailContainers!: QueryList<ViewContainerRef>;

  private static loadedUrls = new Set<string>();

  @ViewChild('searchField') searchField!: ElementRef<HTMLInputElement>;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sortTable!: MatSort;
  @ViewChild('audioPlayer') audioPlayerRef!: ElementRef<HTMLAudioElement>;

  currentGridColumn: GridProperty | null = null;

  private autoRefreshSub: Subscription | null = null;
  private autoRefreshDestroy$ = new Subject<void>();
  private expandedDetailIds = new Set<string>();

  total: number = 0;
  displayedColumns: string[] = [];

  searchValues: Record<string, string> = {};
  openFilterColumn: string | null = null;
  searchSubject = new Subject<Record<string, string>>();

  appliedFilters: Record<string, Record<string, AppliedFiltersDTO>> = {};

  initialSelection: never[] = [];
  allowMultiSelect = true;
  selection: SelectionModel<object> = new SelectionModel<object>(this.allowMultiSelect, this.initialSelection as object[]);

  searchTerm = '';
  multiSearchControl = new FormControl<number[]>([]);
  private searchTermSubject = new Subject<SearchQuery>();
  private destroySearch$ = new Subject<void>();
  protected mappingsColumns = new Map<string, GridProperty>();
  protected baseColumns: GridProperty[] = [];
  private rangeValues: Record<string, { min: number; max: number }> = {};

  pendingMultiSearch: Record<string, {
    ids: number[];
    labels: string[];
    callback?: (columnName: string, filterType: string, value: string | number | string[]) => void;
    options: MultiSearchOptions | null;
  }> = {};

  constructor(private http: HttpClient,
              private cdr: ChangeDetectorRef,
              private elementRef: ElementRef
  ) {
    effect(() => {
      const data = this.data();
      const incoming = this.data();

      if (!this.baseColumns.length && incoming?.length) {
        this.baseColumns = incoming;
      }

      this.mappingsColumns = new Map(this.baseColumns.map(c => [c.name, c]));

      let items: GridProperty[] | undefined = undefined;
      try {
        const raw = localStorage.getItem(this.storageKey);
        if (raw) {
          const parsed = JSON.parse(raw);
          items = parsed?.columns as GridProperty[] | undefined;
        }
      } catch {
      }

      this.reorderColumnsData(items ?? data);
    });
  }

  rows: MatTableDataSource<object> = new MatTableDataSource<object>([]);
  dateFilters: Record<string, FormGroup> = {};
  filterInputValues: Record<string, string> = {};
  filterMultiSelectValues: Record<string, string[]> = {};

  loading = true;

  private destroy$ = new Subject<void>();
  private previousFiltersState = '';
  searchData: SearchItem[] = [];
  selectedItems: number[] = [];

  ngOnInit() {
    this.loadFilters();

    if (!this.lazyLoad()) {
      this.loadData();
    }

    this.setDisplayedColumns();
    this.initSearch();
    this.rows.sort = this.sortTable;
    this.createDateFilter();
    this.restoreFilters();
    this.initCustomFilterSearch();
    this.startAutoRefresh();
  }

  ngAfterViewInit() {
    const url = this.url();
    if (this.lazyLoad() && url && !NgxDataGridx.loadedUrls.has(url)) {
      this.runLazyLoad();
    }

    if (this.disablePagination()) return;

    if (this.paginator) {
      this.limit.set(this.paginator.pageSize);
    }

    this.paginator?.page.subscribe((event) => {
      this.limit.set(event.pageSize);
      this.loadData(event.pageIndex + 1, event.pageSize);

      if (this.openAllToggleDetails()) {
        this.cdr.detectChanges();
        this.setAllDetailsOpened();
      }
    });
  }

  private startAutoRefresh(): void {
    const autoRefreshIntervalSec = this.autoRefreshIntervalSec();
    if (autoRefreshIntervalSec && autoRefreshIntervalSec > 0) {
      this.autoRefreshSub = interval(autoRefreshIntervalSec * 1000)
        .pipe(takeUntil(this.autoRefreshDestroy$))
        .subscribe(() => {
          console.log('Refreshing data...');
          this.loadData(this.paginator?.pageIndex + 1 || 1, this.limit());
        });
    }
  }

  runLazyLoad() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadData();
          NgxDataGridx.loadedUrls.add(this.url()!);
          observer.disconnect();
        }
      });
    }, {
      rootMargin: '100px',
      threshold: 0.1
    });

    observer.observe(this.elementRef.nativeElement);
  }

  showLoader() {
    this.loading = true;
  }

  hideLoader() {
    this.loading = false;
  }

  get storageKey(): string {
    const name = this.grid_name();
    if (name) return `grid-state-${name}`;

    const cols = this.data();
    if (!cols || cols.length === 0) return 'grid-state-auto';

    const names = [...new Set(cols
      .map(c => c?.name ?? '')
      .filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, undefined, {sensitivity: 'base'}));

    return names.length
      ? `grid-state-auto-${names.join('-')}`
      : 'grid-state-auto';
  }


  private loadFilters(): void {
    if (!this.showHistoryFilters) return;
    const raw = localStorage.getItem(this.storageKey);
    if (!raw) return;

    try {
      const state: {
        filters?: Record<string, Record<string, AppliedFiltersDTO>>,
        search?: Record<string, string>
      } = JSON.parse(raw);

      this.appliedFilters = state.filters ?? {};
      this.searchValues = state.search ?? {};

    } catch {
      this.appliedFilters = {};
      this.searchValues = {};
    }
  }

  restoreFilters() {
    Object.entries(this.appliedFilters).forEach(([col, byType]) => {
      const column = this.data().find(c => c.name === col);
      if (!column?.filterValues) return;

      Object.entries(byType).forEach(([type, dto]) => {

        if (type === 'checkbox') {
          const vals = Array.isArray(dto.value) ? dto.value : [dto.value];
          column.filterValues!.forEach(group =>
            group.forEach(item => {
              // @ts-ignore
              item.selected = vals.includes(item.value) ? true : undefined;
            })
          );
        }

        if (type === 'select') {
          this.filterInputValues[col] = String(dto.value);
        }

        if (type === 'multi-select') {
          const values = Array.isArray(dto.value)
            ? dto.value.map(String)
            : [String(dto.value)];

          this.filterMultiSelectValues[col] = values;
        }

        if (type === 'date') {
          const rawVal = String(dto.value);
          if (rawVal.includes(',')) {
            const [s, e] = rawVal.split(',');
            this.dateFilters[col].patchValue({
              start: new Date(s),
              end: new Date(e),
              date: null
            });
          } else {
            this.dateFilters[col].patchValue({
              start: null,
              end: null,
              date: new Date(rawVal)
            });
          }
        }

        if (type === 'range') {
          const raw = String(dto.value);
          if (raw.includes(',')) {
            const [s, e] = raw.split(',');
            const min = Number(s), max = Number(e);
            if (Number.isFinite(min) && Number.isFinite(max)) {
              this.rangeValues[col] = { min, max };
            }
          }
        }
      });
    });
  }

  getRangeMin(col: string, opts?: {min:number; max:number}): number {
    return this.rangeValues[col]?.min ?? Number(opts?.min ?? 0);
  }
  getRangeMax(col: string, opts?: {min:number; max:number}): number {
    return this.rangeValues[col]?.max ?? Number(opts?.max ?? 100);
  }

  private saveFilters(): void {
    if (!this.showHistoryFilters()) return;

    try {
      const raw = localStorage.getItem(this.storageKey);
      const prev = raw ? JSON.parse(raw) : {};

      const next = {
        ...prev,
        filters: this.appliedFilters,
        search: this.searchValues,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(next));
    } catch (e) {
      console.error(e);
    }
  }

  private setDetailInputs(inst: any, row: any) {
    if (typeof inst.row === 'function' && typeof inst.row.set === 'function') {
      inst.row.set(row);
    } else {
      inst.row = row;
    }

    if (typeof inst.rows === 'function' && typeof inst.rows.set === 'function') {
      inst.rows.set(this.rows.data);
    } else {
      inst.rows = this.rows.data;
    }
  }

  private mountDetail(row: any, container: ViewContainerRef, detailComponent: Type<any>) {
    container.clear();
    const cmpRef = container.createComponent(detailComponent);
    this.setDetailInputs(cmpRef.instance, row);
    cmpRef.changeDetectorRef.detectChanges();
  }

  private expandRow(row: any, container: ViewContainerRef, dc: Type<any>) {
    this.mountDetail(row, container, dc);
    this.expandedDetailIds.add(this.getRowId(row));
  }

  private collapseRow(rowId: string, container: ViewContainerRef) {
    container.clear();
    this.expandedDetailIds.delete(rowId);
  }

  toggleDetail(row: any) {
    const rowId = this.getRowId(row);
    const idx = this.rows.data.indexOf(row);
    const container = this.detailContainers.toArray()[idx];
    const dc = this.detailComponent();

    if (!container || !dc) return;

    if (this.expandedDetailIds.has(rowId)) {
      this.collapseRow(rowId, container);
    } else {
      this.expandRow(row, container, dc);
    }
  }

  setAllDetailsOpened(): void {
    const dc = this.detailComponent();
    if (!dc) return;

    const currentIds = new Set(this.rows.data.map(r => this.getRowId(r)));
    this.expandedDetailIds.forEach(id => {
      if (!currentIds.has(id)) this.expandedDetailIds.delete(id);
    });
    this.cdr.detectChanges();

    const containers = this.detailContainers.toArray();

    this.rows.data.forEach((row, idx) => {
      const rowId = this.getRowId(row);
      const container = containers[idx];
      if (!container) return;

      if (this.expandedDetailIds.has(rowId) && container.length > 0) return;
      this.expandRow(row, container, dc);
    });
  }

  private getRowId(row: any): string {
    const sidx = this.sidx();
    if (sidx && row && Object.prototype.hasOwnProperty.call(row, sidx)) {
      return String(row[sidx as keyof typeof row]);
    }
    return JSON.stringify(row);
  }

  isDetailExpanded(row: any): boolean {
    return this.expandedDetailIds.has(this.getRowId(row));
  }

  executeAction(action: Action, row: object | null | undefined) {
    if (action.action) {
      const result = action.action(row);
      const page = this.paginator?.pageIndex + 1 || 1;
      const size = this.paginator?.pageSize || this.limit();

      if (isObservable(result)) {
        result.subscribe({
          complete: () => this.loadData(page, size),
          error: (error) => console.error(error)
        });
      } else if (result instanceof Promise) {
        result
          .then(() => this.loadData(page, size))
          .catch((error) => console.error(error));
      } else if (result instanceof Subscription) {
        result.add(() => {
          this.loadData(page, size);
        });
      }
    }
  }

  getCurrentTheme() {
    return this.theme();
  }

  exportCsvAction() {
    if (!this.exportCsvUrl() || !this.url()) {
      return;
    }

    const params = new URLSearchParams('');

    this.mappingCustomParams(params);
    this.mappingParentGridFiltersParams(params);
    this.setFiltersValues(params, 1, 1);

    this.http.get(`${this.exportCsvUrl()}?${params}`, {
      responseType: 'blob',
    }).subscribe(res => {
      const url = URL.createObjectURL(res);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    });
  }

  onSearchTermChange(multiSearch: { url: string; id: string; label: string; searchTypes?: {
      name: string;
      label: string;
      value: string;
    }[]; } | undefined): void {
    if (!multiSearch) return;

    if (multiSearch) {
      this.searchTermSubject.next({term: this.searchTerm, multiSearch: multiSearch});
    }
  }

  private initCustomFilterSearch(): void {
    this.searchTermSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) =>
        prev.term === curr.term && prev.multiSearch.url === curr.multiSearch.url
      ),
      switchMap(query => {
        if (!query.term.trim()) {
          return of<SearchItem[]>([]);
        }
        let urlWithQuery = `${query.multiSearch.url}?q=${encodeURIComponent(query.term)}`;

        if (this.currentSearchType && query.multiSearch.searchTypes?.length) {
          const selectedType = query.multiSearch.searchTypes.find(
            t => t.value === this.currentSearchType
          );

          if (selectedType) {
            urlWithQuery += `&${selectedType.name}=${encodeURIComponent(selectedType.value)}`;
          }
        }

        return this.http.get<{ response: [] }>(urlWithQuery).pipe(
          map(res =>
            res.response.map(item => ({
              id: item[query.multiSearch.id] as number,
              label: item[query.multiSearch.label] as string,
              ...(item as Record<string, unknown>)
            }))
          )
        );
      }),
      takeUntil(this.destroySearch$)
    ).subscribe({
      next: (res: SearchItem[]) => {
        const currentValue = this.multiSearchControl.value;

        if (!Array.isArray(currentValue)) {
          this.multiSearchControl.setValue(
            currentValue != null ? [currentValue] : []
          );
        }

        const selectedIds = this.multiSearchControl.value ?? [];
        const selectedItems = this.searchData.filter(item =>
          selectedIds.includes(item.id)
        );

        const isSingleSelect = this.currentGridColumn?.filter?.some(
          f => f.type === 'multi-search' && f.multiSearchOptions?.selectSingleOption
        );

        const map = new Map<number, SearchItem>();
        for (const item of [...selectedItems, ...res]) {
          map.set(item.id, item);
        }

        this.searchData = Array.from(map.values());

        if (isSingleSelect && Array.isArray(selectedIds) && selectedIds.length > 1) {
          const lastSelected = selectedIds[selectedIds.length - 1];
          this.multiSearchControl.setValue([lastSelected])
        }

        this.cdr.markForCheck();
      },
      error: err => console.error(err)
    });
  }

  toggleAllItems(
    event: MatOptionSelectionChange,
    columnName: string,
    filter: { callback?: (columnName: string, filterType: string, value: string | number | string[]) => void; multiSearchOptions?: MultiSearchOptions | null }
  ): void {
    if (event.source.selected) {
      const allIds = this.searchData
        .map(item => item.id)
        .filter(id => id !== null && id !== undefined);

      this.multiSearchControl.setValue(allIds, { emitEvent: false });

      this.onMultiSearchSelectionChange(columnName, allIds, filter);
    } else {
      this.multiSearchControl.setValue([], { emitEvent: false });
      delete this.pendingMultiSearch[columnName];
    }
  }



  getSelectedCustomSearchItems(): SearchItem[] {
    const selected: number[] = this.multiSearchControl.value || [];
    return this.searchData.filter(item => selected.includes(item.id));
  }

  onSelectOpened(opened: boolean): void {
    if (opened) {
      this.searchField.nativeElement.focus();
    }
  }

  clearFilter(
    columnName: string | undefined,
    filterType: string | undefined,
    optionValue: string | number | string[]
  ) {

    if (filterType === 'input' && columnName && this.searchValues[columnName]) {
      delete this.searchValues[columnName];
      this.saveFilters();
      this.searchSubject.next({...this.searchValues});
    }

    if (!columnName || !filterType || !this.appliedFilters[columnName] || !this.appliedFilters[columnName][filterType]) {
      return;
    }

    const filterObj: AppliedFiltersDTO = this.appliedFilters[columnName][filterType];
    const column: GridProperty | undefined = this.data().find(col => col.name === columnName);

    if (Array.isArray(filterObj.value) && Array.isArray(filterObj.label)) {
      if (typeof optionValue === "string") {
        const index = filterObj.value
          .map(String)
          .indexOf(String(optionValue));

        if (index !== -1) {
          filterObj.value.splice(index, 1);
          filterObj.label.splice(index, 1);
        }

        if (filterObj.value.length === 0) {
          delete this.appliedFilters[columnName][filterType];

          if (Object.keys(this.appliedFilters[columnName]).length === 0) {
            delete this.appliedFilters[columnName];
          }
        }
      }
    } else {
      delete this.appliedFilters[columnName][filterType];

      if (Object.keys(this.appliedFilters[columnName]).length === 0) {
        delete this.appliedFilters[columnName];
      }
    }

    if (filterType === 'date' && this.dateFilters[columnName]) {
      this.dateFilters[columnName].patchValue({start: null, end: null});
      this.dateFilters[columnName].reset();
    }

    if (filterType === 'multi-search') {
      const current = Array.isArray(this.multiSearchControl.value)
        ? this.multiSearchControl.value
        : [];

      const next = current.filter(v => String(v) !== String(optionValue));

      this.multiSearchControl.setValue(next, { emitEvent: false });

      this.searchData = this.searchData.filter(
        item => String(item.id) !== String(optionValue)
      );
    }

    this.uncheckedCheckbox(column, filterType, optionValue);
    this.saveFilters();
    this.loadData(1, this.limit());
  }


  private uncheckedCheckbox(column: GridProperty | undefined,
                            filterType: string,
                            value: string | string[] | number) {
    if (column && column.filterValues && filterType === "checkbox") {
      column.filterValues.forEach(group => {
        group.forEach(filterItem => {
          if (filterItem.value === value) {
            filterItem.selected = false;
          }
        });
      });
    }
  }

  initSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
      switchMap(() => {
        this.destroy$.next();
        return this.http.get<any>(this.getRequestUrl(1, this.limit())).pipe(
          takeUntil(this.destroy$)
        );
      })
    ).subscribe({
      next: (response) => {
        if (response && Array.isArray(response.response.list)) {
          this.rows.data = response.response.list;
          this.total = response?.response?.total || 0;
        } else if (response && Array.isArray(response.response)) {
          this.rows.data = response.response;
          this.total = response?.response.length || 0;
        }
      },
      error: (error: HttpErrorResponse) => {
        console.error(error.message);
      }
    });
  }

  createDateFilter() {
    this.data().forEach((column) => {
      if (column.filter && column.filter.some(f => f.type === 'date')) {
        this.dateFilters[column.name] = new FormGroup({
          start: new FormControl<Date | null>(null),
          end: new FormControl<Date | null>(null),
          date: new FormControl<Date | null>(null)
        });
        this.subscribeDateFilter(column);
      }
    });
  }

  subscribeDateFilter(column: GridProperty) {
    this.dateFilters[column.name].valueChanges.subscribe(() => {
      this.onDateRangeChange(column.name, this.dateFilters[column.name]);
    });
  }

  clearAllFilters() {
    this.appliedFilters = {};
    this.searchValues = {};

    this.data().forEach((column) => {
      if (column.filterValues) {
        column.filterValues.forEach((group) => {
          group.forEach((filterItem) => filterItem.selected = false);
        });
      }
    });

    Object.keys(this.dateFilters).forEach((key) => {
      this.dateFilters[key].patchValue({start: null, end: null, date: null});
      this.dateFilters[key].reset();
    });

    this.saveFilters();
    this.loadData();
  }

  private formatDate(date: Date | string | null): string {
    if (!date) return '';

    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  checkColumnFilters(column: GridProperty): boolean {
    if (column.search) return true;
    return !!(column.filter && column.filter.length > 0);
  }

  getSelectedLabels(
    options: { label: string; value: string }[] | undefined,
    selected?: string | string[]
  ): string[] {
    if (!options) {
      return [];
    }

    const selectedValues = Array.isArray(selected) ? selected : [selected];
    return options
      .filter(item => selectedValues.includes(item.value))
      .map(item => item.label);
  }


  getSelectedLabelsSearch(selected: number[]): string[] {
    if(!Array.isArray(selected)){
      selected = [selected];
    }

    return this.searchData
      .filter(item => selected?.includes(item.id))
      .map(item => item.label);
  }

  getAppliedFilters(): AppliedFiltersDTO[] {
    const result: AppliedFiltersDTO[] = [];

    Object.keys(this.appliedFilters).forEach((colName) => {
      const filters = this.appliedFilters[colName];
      Object.keys(filters).forEach((filterType) => {
        const filterObj: AppliedFiltersDTO = filters[filterType];

        if (Array.isArray(filterObj.label) && Array.isArray(filterObj.value)) {
          filterObj.label.forEach((lbl: string, index: number) => {
            const value = Array.isArray(filterObj.value) ? filterObj.value[index]?.toString() : filterObj.value.toString();
            result.push({
              column: colName,
              filterType: filterType,
              value: value,
              label: lbl
            });
          });
        } else {
          result.push({
            column: colName,
            filterType: filterType,
            value: filterObj.value?.toString(),
            label: filterObj.label?.toString()
          });
        }
      });
    });

    Object.keys(this.searchValues).forEach((colName) => {
      const column = this.data().find(col => col.name === colName);
      if (this.searchValues[colName]) {
        result.push({
          column: colName,
          filterType: 'input',
          value: this.searchValues[colName],
          label: `Пошук по ${column?.displayName || colName}: "${this.searchValues[colName]?.length > 50
            ? this.searchValues[colName].slice(0, 50) + '...'
            : this.searchValues[colName]}"`
        });
      }
    });

    return result;
  }

  onSearch(columnName: string, event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();

    if (value) {
      this.searchValues[columnName] = value;
    } else {
      delete this.searchValues[columnName];
    }

    this.saveFilters();
    this.searchSubject.next({...this.searchValues});
  }

  toggleFilter(columnName: string, event: Event) {
    event.stopPropagation()
    this.openFilterColumn = this.openFilterColumn === columnName ? null : columnName;

    this.setInputFocus(event);
  }


  private setInputFocus(event: Event) {
    setTimeout(() => {
      const th = (event.target as HTMLElement).closest('th');
      if (!th) return;
      const input = th.querySelector<HTMLInputElement>('input');
      if (input) {
        input.focus();
      }
    });

    return this;
  }

  setDisplayedColumns() {
    this.displayedColumns = [...new Set(this.data().map(col => col.name))];
    if (this.multiselect()) this.displayedColumns.unshift('select');
  }

  getRequestUrl(page = 1, pageSize = this.limit()): string {
    const url = this.url();
    if (!url) return '';

    const [baseUrl, queryString] = url.split('?');
    const params = new URLSearchParams(queryString || '');

    this.mappingCustomParams(params);
    this.mappingParentGridFiltersParams(params);
    this.setFiltersValues(params, page, pageSize);

    return `${baseUrl}?${params.toString()}`;
  }

  isSubGrid(): boolean {
    return !!this.currentRow();
  }

  private mappingCustomParams(params: URLSearchParams) {
    const subUrlParams = this.subUrlParams();
    if (!this.currentRow() || !this.subUrlParams()) {
      return;
    }

    const rowData = this.currentRow() as Record<string, unknown>;

    subUrlParams?.forEach(({paramName, columnName}) => {
      if (Object.prototype.hasOwnProperty.call(rowData, columnName)) {
        const value = rowData[columnName];

        if (value !== undefined && value !== null) {
          params.set(paramName, String(value));
        }
      }
    });
  }

  private reorderColumnsData(input: GridProperty[] | undefined) {
    const base = this.baseColumns.length ? this.baseColumns : (input ?? []);
    const byName = new Map<string, GridProperty>();
    (input ?? base).forEach(c => byName.set(c.name, c));
    base.forEach(c => { if (!byName.has(c.name)) byName.set(c.name, c); });

    const merged = Array.from(byName.values());

    const withIdx = merged.map((c, i) => ({ c, i }));
    withIdx.sort((a, b) => {
      const ax = a.c.type === GridPropertyType.Actions ? Number.MAX_SAFE_INTEGER : (a.c.columnIndex ?? a.i);
      const bx = b.c.type === GridPropertyType.Actions ? Number.MAX_SAFE_INTEGER : (b.c.columnIndex ?? b.i);
      return ax - bx;
    });

    const sorted = withIdx.map(x => x.c);

    const regular = sorted.filter(c => c.visible !== false && c.type !== GridPropertyType.Hidden && c.type !== GridPropertyType.Actions);
    const actions = sorted.filter(c => c.visible !== false && c.type === GridPropertyType.Actions);

    const names = [
      ...regular.map(c => c.name),
      ...actions.map(c => c.name),
    ];

    this.displayedColumns = this.multiselect() ? ['select', ...names] : names;
  }


  resolveColumn(name: string): GridProperty | null {
    return this.mappingsColumns.get(name) ?? null;
  }

  private mappingParentGridFiltersParams(params: URLSearchParams) {
    if (!this.isSubGrid() || !this.parentGridFilters()) return;

    const {search, filters} = this.parentGridFilters();

    Object.keys(search).forEach((searchColumn) => {
      const searchValue = search[searchColumn];
      if (searchValue) {
        params.set(searchColumn, searchValue);
      }
    });

    Object.keys(filters).forEach((columnName) => {
      const columnFilters = filters[columnName];

      Object.keys(columnFilters).forEach((filterType) => {
        const filterObj = columnFilters[filterType];
        let value = filterObj.value;

        if (Array.isArray(value)) {
          value = value.join(',');
        }

        params.set(columnName, value.toString());
      });
    });
  }


  private setFiltersValues(params: URLSearchParams, page = 1, pageSize = this.limit()) {
    const sidx = this.sidx();
    const sort = this.sort();
    params.append('page', page.toString());
    params.append('limit', pageSize.toString());

    if (sidx) {
      params.append('sidx', sidx.toString());
    }
    if (sort) {
      params.append('sort', sort.toString());
    }

    Object.keys(this.searchValues).forEach(columnName => {
      const value = this.searchValues[columnName];
      if (value) {
        params.append(columnName, value);
      }
    });

    Object.keys(this.appliedFilters).forEach((columnName) => {
      const filters = this.appliedFilters[columnName];

      Object.keys(filters).forEach((filterType) => {
        const filterObj = filters[filterType];
        const value = filterObj.value;

        if (this.checkFilterType(filterType, 'checkbox') || this.checkFilterType(filterType, 'multi-select') || this.checkFilterType(filterType, 'multi-search')) {
          const cleaned = Array.isArray(value)
            ? value.filter(v => v !== null && v !== undefined && v !== '')
            : value;

          const selectedValues = Array.isArray(cleaned) ? cleaned.join(',') : cleaned;
          this.setFilterValue(params, columnName, selectedValues);

        } else if (this.checkFilterType(filterType, 'select') || this.checkFilterType(filterType, 'input')) {
          this.setFilterValue(params, columnName, value);

        } else if (this.checkFilterType(filterType, 'date') && this.checkDateFilterValues(columnName)) {
          const formattedStart = this.dateFilters[columnName].value.start ? this.formatDate(this.dateFilters[columnName].value.start) : null;
          const formattedEnd = this.dateFilters[columnName].value.end ? this.formatDate(this.dateFilters[columnName].value.end) : null;
          const formattedDate = this.dateFilters[columnName].value.date ? this.formatDate(this.dateFilters[columnName].value.date) : null;

          const date = formattedStart && formattedEnd
            ? `${formattedStart},${formattedEnd}`
            : formattedDate;
          this.setFilterValue(params, columnName, `${date}`);
        } else if (this.checkFilterType(filterType, 'range')) {
          this.setFilterValue(params, columnName, String(value));
        }
      });
    });
  }

  private checkDateFilterValues(columnName: string) {
    return (this.dateFilters[columnName]?.value.start && this.dateFilters[columnName]?.value.end) || this.dateFilters[columnName]?.value?.date
  }

  private setFilterValue(params: URLSearchParams,
                         columnName: string,
                         selectedValues: string | number | string[]) {
    return params.set(`${columnName}`, selectedValues.toString());
  }

  private checkFilterType(filterType: string, type: string) {
    return filterType === type;
  }

  loadData(page = 1, pageSize = this.limit()) {
    this.showLoader();

    if (!this.url()) return;

    if (!this.destroy$.closed) {
      this.destroy$.next();
      this.destroy$.complete();
    }

    this.destroy$ = new Subject<void>();

    this.http.get<any>(this.getRequestUrl(page, pageSize)).pipe(
      takeUntil(this.destroy$),
      finalize(() => this.hideLoader())
    ).subscribe({
      next: (data) => {
        const resp = data.response;

        if (Array.isArray(resp)) {
          this.rows.data = resp;
          this.total = resp.length;
        } else {
          const {list, total, ...singleObject} = resp;

          if (Array.isArray(list)) {
            this.rows.data = list;
            this.total = total ?? list.length;
          } else {
            this.rows.data = [singleObject];
            this.total = 1;
          }
        }

        this.selection.clear();
        this.hideLoader();

        if (this.openAllToggleDetails()) {
          this.cdr.detectChanges();
          this.setAllDetailsOpened();
        }

        // this.openFilterColumn = null;
      },
      complete: () => {
        this.rollbackExpandedElement();
      },
      error: (error: HttpErrorResponse) => {
        console.error(error.message);
        this.hideLoader();
        // this.openFilterColumn = null;
      }
    });
  }

  rollbackExpandedElement() {
    const expandedElement = this.expandedElement();
    if (expandedElement) {
      const openId = expandedElement[this.sidx() as keyof typeof expandedElement];

      if (openId !== undefined) {
        const updatedRow = this.rows.data.find(
          (row) => row[this.sidx() as keyof typeof row] === openId
        );

        this.expandedElement.set(updatedRow || null);
      }
    }
  }

  private isFilterChanged(): boolean {
    const currentFiltersState = JSON.stringify(this.appliedFilters);

    if (this.previousFiltersState !== currentFiltersState) {
      this.previousFiltersState = currentFiltersState;
      return true;
    }

    return false;
  }

  onFilterChange(
    columnName: string,
    filterType: string,
    label: string | string[],
    value: string | number | string[],
    callback?: (columnName: string, filterType: string, value: string | number | string[]) => void,
    multiSearchOptions: MultiSearchOptions | null = null
  ) {
    if (Array.isArray(value)) {
      value = value.filter(v => v !== undefined);
    }

    if(filterType === 'multi-search' && multiSearchOptions?.selectSingleOption) {
      this.openFilterColumn = null;
    }

    this.showLoader();
    if ((filterType === 'checkbox' || filterType === 'multi-select' || filterType === 'multi-search') && !Array.isArray(label)) {
      label = [label];
    }

    if (filterType === 'range') {
      const raw = Array.isArray(value) ? value.join(',') : String(value);
      const [s, e] = raw.split(',');

      const minNum = Number(s);
      const maxNum = Number(e);

      if (!Number.isFinite(minNum) || !Number.isFinite(maxNum)) {
        return;
      }

      const lo = Math.min(minNum, maxNum);
      const hi = Math.max(minNum, maxNum);

      this.rangeValues[columnName] = { min: lo, max: hi };

      value = `${lo},${hi}`;
      label = `від ${lo} до ${hi}`;
    }

    if (!value || (Array.isArray(value) && value.length === 0)) {
      if (this.appliedFilters[columnName]) {
        delete this.appliedFilters[columnName][filterType];

        if (Object.keys(this.appliedFilters[columnName]).length === 0) {
          delete this.appliedFilters[columnName];
        }
      }
    } else {
      if (!this.appliedFilters[columnName]) {
        this.appliedFilters[columnName] = {};
      }

      this.appliedFilters[columnName][filterType] = {value: value, label: label};
    }

    if (callback) {
      callback(columnName, filterType, value);
    }

    if (filterType !== 'multi-search') {
      this.saveFilters();
    }

    this.loadData(1, this.limit());
  }

  onDateRangeChange(columnName: string, dateGroup: FormGroup) {
    const raw = dateGroup.value;

    const hasStart = !!raw.start;
    const hasEnd   = !!raw.end;
    const hasDate  = !!raw.date;

    const isSingleDate = hasDate && !hasStart && !hasEnd;
    const isRange      = (hasStart || hasEnd) && !hasDate;

    let value: string | null = null;

    if (isSingleDate) {
      value = this.formatDate(raw.date);
    } else if (isRange && hasStart && hasEnd) {
      const start = this.formatDate(raw.start);
      const end   = this.formatDate(raw.end);
      value = `${start},${end}`;
    }

    if (value) {
      if (!this.appliedFilters[columnName]) {
        this.appliedFilters[columnName] = {};
      }

      this.appliedFilters[columnName]['date'] = {
        label: `Дата ${value}`,
        value: value
      };

      this.saveFilters();

      if (this.openFilterColumn === columnName) {
        this.openFilterColumn = null;
      }

      this.loadData(1, this.limit());
    } else {
      if (this.appliedFilters[columnName]) {
        delete this.appliedFilters[columnName]['date'];

        if (!Object.keys(this.appliedFilters[columnName]).length) {
          delete this.appliedFilters[columnName];
        }

        this.saveFilters();
        this.loadData(1, this.limit());
      }
    }
  }


  onInputFilterChange(columnName: string,
                      filterType: string,
                      label: string,
                      value: string,
                      callback?: (columnName: string, filterType: string, value: string) => void) {
    this.showLoader();
    if (!this.appliedFilters[columnName]) {
      this.appliedFilters[columnName] = {};
    }

    if (value) {
      this.appliedFilters[columnName][filterType] = {value: value, label: label};
    } else {
      delete this.appliedFilters[columnName][filterType];

      if (Object.keys(this.appliedFilters[columnName]).length === 0) {
        delete this.appliedFilters[columnName];
      }
    }

    if (callback) {
      callback(columnName, filterType, value);
    }
  }

  isCheckboxChecked(columnName: string, value: string | number): boolean {
    const v = this.appliedFilters[columnName]?.['checkbox']?.value;
    if (!Array.isArray(v)) return false;
    return v.map(String).includes(String(value));
  }

  onCheckboxChange(
    columnName: string,
    filterType: 'checkbox',
    label: string,
    value: string,
    checked: boolean,
    callback?: (columnName: string, filterType: string, value: string | number | string[]) => void
  ) {
    const currentValues = this.appliedFilters[columnName]?.[filterType]?.value;
    const currentLabels = this.appliedFilters[columnName]?.[filterType]?.label;

    const values = Array.isArray(currentValues) ? [...currentValues] : [];
    const labels = Array.isArray(currentLabels) ? [...currentLabels] : [];

    const idx = values.map(String).indexOf(String(value));

    if (checked && idx === -1) {
      values.push(value);
      labels.push(label);
    } else if (!checked && idx !== -1) {
      values.splice(idx, 1);
      labels.splice(idx, 1);
    }

    this.onFilterChange(columnName, filterType, labels, values, callback);
  }

  onSortChange(sortEvent: Sort) {
    const column = this.data().find(col => col.name === sortEvent.active);
    this.sidx.set("id");
    this.sort.set("asc");

    if (sortEvent.direction) {
      this.sidx.set(column && column.columnSortIndex ? column.columnSortIndex : sortEvent.active);
      this.sort.set(sortEvent.direction);
    }

    const pageSize = this.paginator?.pageSize || this.limit();
    this.loadData(1, pageSize);
  }

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.rows.data.length;
    return numSelected == numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  toggleAllRows() {
    if (this.isAllSelected()) {
      this.selection.clear();
    } else {
      this.rows.data.forEach(row => this.selection.select(row));
    }
  }

  setCurrentGridColumn(name: string | undefined | null, row: object): void {
    const column = this.data().find(col => col.name === name);
    if (!column) {
      console.log(`not found ${column}`);
      return;
    }

    if (this.expandedElement() === row && this.currentGridColumn?.name === column.name) {
      this.expandedElement.set(null);
      this.currentGridColumn = null;
    } else {
      this.expandedElement.set(row);
      this.currentGridColumn = column;
    }
  }

  trackByKey(index: number, item: GridProperty | null): string {
    return item?.name || index.toString();
  }

  isColumnExpanded(column: GridProperty, row: object): boolean {
    return this.currentGridColumn?.name === column.name && this.expandedElement() === row;
  }

  checkIsCurrentColumnSubGrid(column = this.currentGridColumn): boolean {
    return !!(column && column.ident && column.subGridPropertyList?.length);
  }

  getSelectedRecords(): object {
    return this.selection.selected ?? [];
  }

  IsCustomCallbackExist(column: GridProperty): boolean {
    const data = this.resolveColumn(column.name) ?? column;
    return data && typeof data.callback === 'function';
  }

  getAllClasses(column: GridProperty, row: object): Record<string, boolean> {
    const classes: Record<string, boolean> = {};

    const rowIndex = this.rows?.data.findIndex(r => r === row) ?? 0;
    if (column?.style_formatter) {
      const styleClass = column.style_formatter(row, rowIndex);
      if (styleClass) {
        classes[styleClass] = true;
      }
    }

    if (column?.classes) {
      classes[column.classes] = true;
    }

    return classes;
  }

  uniquePageSizeOptions(): number[] {
    return Array.from(new Set([this.limit(), 100, 500, 1000]));
  }

  isPath(path: string): boolean {
    const pathRegex = /^(\/|\.\/|\.\.|[a-zA-Z]:\\|~\/|assets\/|https?:\/\/)[^\0]+$/;
    return pathRegex.test(path);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;

    if (target.closest('.filter-container')) {
      return;
    }

    if (
      target.closest('.cdk-overlay-pane') instanceof HTMLElement &&
      (
        target.closest('.mat-datepicker-content') ||
        target.closest('.mat-calendar')
      )
    ) {
      return;
    }

    if (target.closest('.cdk-overlay-pane')) {
      return;
    }

    if (this.openFilterColumn) {
      this.confirmMultiSearch(this.openFilterColumn);
    } else {
      this.openFilterColumn = null;
    }
  }


  ngOnDestroy(): void {
    const url = this.url();
    if (url) {
      NgxDataGridx.loadedUrls.delete(url);
    }

    this.destroy$.next();
    this.destroy$.complete();

    this.autoRefreshDestroy$.next();
    this.autoRefreshDestroy$.complete();

    if (this.autoRefreshSub) {
      this.autoRefreshSub.unsubscribe();
    }
  }

  confirmMultiSearch(columnName: string): void {
    const pending = this.pendingMultiSearch[columnName];
    if (!pending) {
      this.openFilterColumn = null;
      return;
    }

    const value = pending.ids.map(String);

    this.onFilterChange(
      columnName,
      'multi-search',
      pending.labels,
      value,
      pending.callback,
      pending.options
    );

    delete this.pendingMultiSearch[columnName];
    this.openFilterColumn = null;
  }


  onMultiSearchSelectionChange(
    columnName: string,
    selectedIds: number[],
    filter: { callback?: (columnName: string, filterType: string, value: string | number | string[]) => void; multiSearchOptions?: MultiSearchOptions | null }
  ): void {
    const labels = this.getSelectedLabelsSearch(selectedIds);

    this.pendingMultiSearch[columnName] = {
      ids: selectedIds,
      labels,
      callback: filter.callback,
      options: filter.multiSearchOptions ?? null
    };
  }

  @HostListener('document:keydown.enter', ['$event'])
  onDocumentEnter(event: KeyboardEvent): void {
    if (!this.openFilterColumn) {
      return;
    }

    const pending = this.pendingMultiSearch[this.openFilterColumn];
    if (!pending) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    this.confirmMultiSearch(this.openFilterColumn);
  }


  protected readonly GridPropertyType = GridPropertyType;
  protected readonly GridTheme = GridTheme;
}

export interface AppliedFiltersDTO {
  column?: string;
  filterType?: string;
  value: string | number | string[];
  label: string | number | string[];
}

export interface Action {
  action?: (row: object | null | undefined) => Promise<void> | Observable<void> | void | Subscription;
}

export interface SearchItem {
  id: number;
  label: string;
}

interface SearchQuery {
  term: string;
  multiSearch: {
    url: string;
    id: string;
    label: string;
    searchTypes?: {
      name: string;
      label: string;
      value: string;
    }[];
  };
}

export enum GridTheme {
  BROAD = 'broad',
  FLAT = 'flat'
}
