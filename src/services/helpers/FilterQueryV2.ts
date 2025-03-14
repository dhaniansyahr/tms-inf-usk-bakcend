import { FilteringQueryV2, RangedFilter } from "$entities/Query";


function buildSearchQuery(searchFilters:Record<string, any | any[] | null>):any[]{
  let whereClauseAndResult:any = [];
  let orQuerySearchArray:any[] = [];
  
  const isMultiKey = Object.values(searchFilters).length > 1;
  
  for (const key in searchFilters) {
    const valueToSearch = searchFilters[key]
    //Additional null safe checking for guarantee
    if (valueToSearch == null) continue;
    
    let searchQuery:any = {}
    
    if (key.includes(".")) {
      let [relation, column] = key.split(".");

      if(valueToSearch != null ){
        searchQuery = {
          [`${relation}`]:{
            [`${column}`]: {
              contains: valueToSearch
            }
          } 
        }
        isMultiKey ? orQuerySearchArray.push(searchQuery) : whereClauseAndResult.push(searchQuery)      
      }
      continue;
    }

    if(valueToSearch != null ){
      searchQuery = {
        [`${key}`]: {
          contains: valueToSearch
        }
      }
      isMultiKey ? orQuerySearchArray.push(searchQuery) : whereClauseAndResult.push(searchQuery)
    }
    
  }

  if(isMultiKey){
    whereClauseAndResult.push({
      OR: orQuerySearchArray
    })
  }

  return whereClauseAndResult;
}

function buildWhereQuery(filters:Record<string, any | any[] | null>):any[]{
  let whereClauseAndResult:any = [];
  for (const key in filters) {
    const valueToFilter = filters[key];
      
    //Additional early null safe checking for guarantee
    if (valueToFilter == null) continue;

    // Check for relational data filter (only 1 level is allowed)
    if (key.includes(".")) {
      let [relation, column] = key.split(".");

      if(Array.isArray(valueToFilter) && valueToFilter != null ){
        const orQueryArray = valueToFilter.map((value)=>(
          {
            [`${relation}`]:{
              [`${column}`]: value
            } 
          }
        ))
        whereClauseAndResult.push({
          OR:orQueryArray
        })
      }
      
      if(!Array.isArray(valueToFilter) && valueToFilter != null) {
        whereClauseAndResult.push({
            [`${relation}`]:{
              [`${column}`]: valueToFilter
            } 
        })
      }
      continue;
    }

    if(Array.isArray(valueToFilter) && valueToFilter != null ){
      const valueToFilterArray = valueToFilter;
      const orQueryArray = valueToFilterArray.map((value)=>(
        {
          [`${key}`]: value
        }
      ))
      whereClauseAndResult.push({
        OR:orQueryArray
      })
    } if(!Array.isArray(valueToFilter) && valueToFilter != null) {
      whereClauseAndResult.push( {
          [`${key}`]: valueToFilter
        })
    }
    
  }

  return whereClauseAndResult
} 


function isValidDate(dateString: any): boolean{
  if (typeof dateString !== "string") {
    return false
  }
  const dateRegex = /^(?:\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z|\d{4}-\d{2}-\d{2})$/;
  return dateRegex.test(dateString);
}

function parseAndCheckRangeFilter(range: RangedFilter): any {
  if(isValidDate(range.start) && isValidDate(range.end)){
      range.start = new Date(range.start)
      range.end = new Date(range.end)
    } else {
      range.start = range.start 
      range.end = range.end
  }
  
  return range
}

function buildRangedFilter(rangedFilters:RangedFilter[]):any[]{
  const whereClauseAndResult:any[] = [];

  rangedFilters.forEach((range: RangedFilter) => {
    range = parseAndCheckRangeFilter(range)
    whereClauseAndResult.push({
      [`${range.key}`]:{
        gte: range.start,
        lte: range.end
      }
    })
  })

  return whereClauseAndResult
}


export function buildFilterQueryLimitOffsetV2(filter: FilteringQueryV2) {
  let usedFilter: any = {
    where: {
      AND:[]
    },
    orderBy: {
    },
  };

  /* This is the `inference-engine` for dynamic filtering 

    in V2 both Searching and Filters are constructed in type of `ClauseFilterV2` 

    Which formed like : 
    {
      "filters": {
         "column" : ["value1", "value2"] -> multi value filter , in v1 we use SQL's in operator, but now we use OR chaining
         "column2" : "value" -> single value filter , we use WHERE = 
         "column3" : null -> we don't handle this, since this is just a placeholder from fe
      }
    }

    We give these flexibility so that front-end can have the flexibility of filtering easier by just sending null and emit the value 
    as user fill the filter inside the dropdown or whatever input they use.

  
  */
  if (filter.filters) {
    usedFilter.where.AND = buildWhereQuery(filter.filters)
  }
  
  if(filter.searchFilters){
    
    usedFilter.where.AND = buildSearchQuery(filter.searchFilters).reduce((arr,v)=>{
      arr.push(v)
      return arr
    },usedFilter.where.AND)
  }

  if(filter.rangedFilters){
    usedFilter.where.AND = buildRangedFilter(filter.rangedFilters).reduce((arr,v)=>{
      arr.push(v)
      return arr
    },usedFilter.where.AND)
  }

  if (filter.orderKey) {
    const orderRule = filter.orderRule ?? "asc";
    usedFilter.orderBy = {
        [`${filter.orderKey}`]: `${orderRule}`,
      }
  }


  // Default is take 10 rows, page 1 (skip 0, means we are at page 1 at the paging result.)
  let take = 10;
  let skip = 0;

  if(filter.page){
    if(filter.rows){
      skip = (filter.page - 1)  * filter.rows;
      take = filter.rows;
    } else {
      skip = 10 * (filter.page - 1);
    }
  } 

  usedFilter.take = take;
  usedFilter.skip = skip;


  return usedFilter;
}
