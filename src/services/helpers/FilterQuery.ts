import { FilteringQuery } from "$entities/Query";

export function buildFilterQuery(filter: FilteringQuery) {
  let usedFilter: any = {
    where: {
      AND: [],
    },
    orderBy: {
      createdAt: "desc",
    },
  };

  if (filter.filters) {
    for (const key in filter.filters) {
      const inArray = filter.filters[key].values.map((val) => val);
      if (key.includes(".")) {
        let [relation, column] = key.split(".");
        if(inArray.length === 1){
          usedFilter.where.AND.push({
            [`${relation}`]: {
              [`${column}`]: inArray,
            },
          });
        }else{
          usedFilter.where.AND.push({
            [`${relation}`]: {
              [`${column}`]: {
                in: inArray,
              },
            },
          });
        }
      } else {
         if(inArray.length === 1){
          usedFilter.where.AND.push({
            [`${key}`]: inArray[0]
          })
        }
        else{
          usedFilter.where.AND.push({
            [`${key}`]: {
              in: inArray,
            },
          });
        }
      }
    }
  }
  if (filter.orderKey) {
    const orderRule = filter.orderRule ?? "asc";
    usedFilter = {
      ...usedFilter,
      orderBy: {
        [`${filter.orderKey}`]: `${orderRule}`,
      },
    };
  }

  if (filter.searchKey && filter.searchValue) {
    if (filter.searchKey.includes(".")) {
      let [relation, column] = filter.searchKey.split(".");
      usedFilter.where.AND.push({
        [`${relation}`]: {
          [`${column}`]: {
            contains: `${filter.searchValue}`,
          },
        },
      });
    } else {
      usedFilter.where.AND.push({
        [`${filter.searchKey}`]: {
          contains: `${filter.searchValue}`,
        },
      });
    }
  }

  if (filter.startRange) {
    if (filter.endRange) {
      usedFilter.where.AND.push({
        createdAt: {
          lte: new Date(`${filter.endRange}T23:59:59`),
          gte: new Date(filter.startRange),
        },
      });
    }
  }

  const initRows = filter.rows ? filter.rows + 1 : 11;

  let rows = initRows;

  if (filter.cursor) {
    if (filter.cursorDirection && filter.cursorDirection == "previous") {
      rows = rows * -1;
    }
    usedFilter = {
      cursor: {
        createdAt: filter.cursor,
      },
      ...usedFilter,
    };
  }

  usedFilter = {
    take: rows,
    ...usedFilter,
  };

  return usedFilter;
}



export function buildFilterQueryLimitOffset(filter: FilteringQuery) {
  let usedFilter: any = {
    where: {
      AND: [],
    },
    orderBy: {
    },
  };

  if (filter.filters) {
    for (const key in filter.filters) {
      const inArray = filter.filters[key].values.map((val) => val);
      if (key.includes(".")) {
        let [relation, column] = key.split(".");
        if(inArray.length === 1){
          usedFilter.where.AND.push({
            [`${relation}`]: {
              [`${column}`]: inArray,
            },
          });
        }else{
          usedFilter.where.AND.push({
            [`${relation}`]: {
              [`${column}`]: {
                in: inArray,
              },
            },
          });
        }
      } else {
        if(inArray.length === 1){
          usedFilter.where.AND.push({
            [`${key}`]: inArray[0]
          })
        }
        else{
          usedFilter.where.AND.push({
            [`${key}`]: {
              in: inArray,
            },
          });
        }
      }
    }
  }
  if (filter.orderKey) {
    const orderRule = filter.orderRule ?? "asc";
    usedFilter = {
      ...usedFilter,
      orderBy: {
        [`${filter.orderKey}`]: `${orderRule}`,
      },
    };
  }

  if (filter.searchKey && filter.searchValue) {
    if (filter.searchKey.includes(".")) {
      let [relation, column] = filter.searchKey.split(".");
      usedFilter.where.AND.push({
        [`${relation}`]: {
          [`${column}`]: {
            contains: `${filter.searchValue}`,
          },
        },
      });
    } else {
      usedFilter.where.AND.push({
        [`${filter.searchKey}`]: {
          contains: `${filter.searchValue}`,
        },
      });
    }
  }



  if(filter.page){
    if(filter.rows){
        usedFilter = {
            skip: (filter.page - 1)  * filter.rows,
            take: filter.rows,
            ...usedFilter
        }
    }else{
        usedFilter = {
            skip: 10 * (filter.page - 1),
            take: 10 ,
            ...usedFilter
        }
    }
  }else{
    usedFilter = {
        take:10,
        ...usedFilter
    }
  }

  usedFilter = {
    ...usedFilter,
  };

  return usedFilter;
}
