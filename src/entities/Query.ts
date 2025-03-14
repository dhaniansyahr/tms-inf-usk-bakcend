export interface ClauseFiltersContent {
  values: string[];
}
export interface ClauseFilters {
  [filterKey: string]: ClauseFiltersContent;
}


export interface StatsClauseFilters {
  [filterKey: string]: string;
}

export interface FilteringQuery {
  page?: number;
  rows?: number;
  cursor?: string;
  orderKey?: string;
  orderRule?: string;
  filters?: ClauseFilters;
  searchKey?: string;
  searchValue?: string;
  startRange?: string;
  endRange?: string;
  cursorDirection?: string;
}


/*

Anything Above This Comment Is Interface used in V1 Filter Query 
Please Use V2 :)

*/


export interface RangedFilter{
  key:string 
  start:any 
  end:any 
}

export interface FilteringQueryV2 {
  page?: number;
  rows?: number;
  cursor?: string;
  orderKey?: string;
  orderRule?: string;
  filters?: Record<string, any | any[] | null>;
  searchFilters?: Record<string, any | null>;
  rangedFilters?: RangedFilter[]
}


/*
  As part of the dynamic filtering + pagination 
  and also making the code base more `type-safe`
  this interface serve as an interface of return data from Service Response 

  usage is like :

  Promise<ServiceResponse<PagedList<User>>>

*/
export interface PagedList<T>{
  entries: T
  totalData: number 
  totalPage : number
}
