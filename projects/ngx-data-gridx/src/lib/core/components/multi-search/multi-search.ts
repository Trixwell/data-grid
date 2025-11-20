import {ChangeDetectorRef, Component, effect, ElementRef, input, model, ViewChild} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatFormField, MatInput} from '@angular/material/input';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {debounceTime, distinctUntilChanged, switchMap} from 'rxjs/operators';
import {map, of, Subject, takeUntil} from 'rxjs';
import {AppliedFiltersDTO, SearchItem} from '../../../ngx-data-gridx/ngx-data-gridx.component';
import {HttpClient} from '@angular/common/http';
import {MatOption, MatOptionSelectionChange} from '@angular/material/core';
import {UtilsService} from '../../services/utils.service';
import {GridFilterDTO, GridProperty} from '../../entity/grid-property';
import {GridColumnSortService} from '../../services/grid-column-sort.service';
import {MatSelectModule} from '@angular/material/select';

@Component({
  selector: 'app-multi-search',
  imports: [
    FormsModule,
    MatFormField,
    MatInput,
    MatOption,
    MatRadioButton,
    MatRadioGroup,
    ReactiveFormsModule,
    MatSelectModule
  ],
  templateUrl: './multi-search.html',
  styleUrl: './multi-search.scss'
})
export class MultiSearch {
  @ViewChild('searchField') searchField!: ElementRef<HTMLInputElement>;

  private searchTermSubject = new Subject<SearchQuery>();
  private destroySearch$ = new Subject<void>();
  searchTerm = '';
  currentSearchType: string | null = null;

  multiSearchControl = new FormControl<number[]>([]);
  searchData: SearchItem[] = [];

  appliedFilters = model<Record<string, Record<string, AppliedFiltersDTO>>>({});
  currentGridColumn = input<GridProperty | null>(null);
  filter = input<GridFilterDTO>();
  column = input<GridProperty>();
  onFilterChange = input<
    (columnName: string,
     filterType: string,
     label: string | string[],
     value: any,
     callback?: any
    ) => void
  >();
  loadData = input<(page: number, pageSize: number) => void>();
  showHistoryFilters = input.required<boolean>();
  searchValues = input<Record<string, string>>();
  gridName = input<string>();
  limit = input<number>(5);
  data = input.required<GridProperty[]>();

  constructor(
    private http: HttpClient,
    protected utilsService: UtilsService,
    private cdr: ChangeDetectorRef,
    protected gridColumnSortService: GridColumnSortService
  ) {
    effect(() => {
      console.log(this.appliedFilters());
    });
  }


  ngOnInit() {
    this.initCustomFilterSearch();
  }

  getSelectedLabelsSearch(selected: number[]): string[] {
    if(!Array.isArray(selected)){
      selected = [selected];
    }

    return this.searchData
      .filter(item => selected?.includes(item.id))
      .map(item => item.label);
  }

  initCustomFilterSearch(): void {
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

        const isSingleSelect = this.currentGridColumn()?.filter?.some(
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

  toggleAllItems(event: MatOptionSelectionChange, columnName: string): void {
    if (event.source.selected) {

      const allIds = this.searchData
        .map(item => item.id)
        .filter(id => id !== null && id !== undefined);

      const labels = this.searchData
        .map(item => item.label)
        .filter(label => label != null);

      this.multiSearchControl.setValue(allIds, { emitEvent: false });

      this.onFilterChange()?.(
        columnName,
        'multi-search',
        labels,
        allIds.map(String)
      );

    } else {

      this.multiSearchControl.setValue([], { emitEvent: false });

      if (this.appliedFilters()[columnName]) {
        delete this.appliedFilters()[columnName]['multi-search'];

        if (Object.keys(this.appliedFilters()[columnName]).length === 0) {
          delete this.appliedFilters()[columnName];
        }
      }

      this.utilsService.saveFilters(
        this.showHistoryFilters(),
        this.gridColumnSortService.storageKey(
          this.gridName(),
          this.data()
        ),
        this.appliedFilters(),
        this.searchValues()!
      );
      this.loadData()?.(1, this.limit());
    }
  }

  onSelectOpened(opened: boolean): void {
    if (opened) {
      this.searchField.nativeElement.focus();
    }
  }
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
