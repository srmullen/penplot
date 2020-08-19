export function* shell(exchange, compare, list) {
  // Use the experimentally derived Ciura sequence, from the Shell Sort Wikipedia entry.
  const gapSeq = [701, 301, 132, 57, 23, 10, 4, 1];
  // There's no need to sort gaps larger than the list so find the gap to use.
  let gapIndex = gapSeq.findIndex(n => n < list.length);
  while (gapIndex < gapSeq.length) {
    const gap = gapSeq[gapIndex];
    for (let i = gap; i < list.length; i++) {
      for (let j = i; j >= gap && compare(list[j], list[j - gap]) < 0; j -= gap) {
        exchange(list, j, j - gap);
        yield { list: list.map(a => a) };
      }
    }
    gapIndex++;
  }
  return list;
}

export function* insertion(exchange, compare, list) {
  for (let i = 0; i < list.length; i++) {
    // Move backwards over the already sorted elements and continue swaping until
    // newest element is in the correct location.
    for (let j = i; j > 0 && compare(list[j], list[j - 1]) < 0; j--) {
      exchange(list, j, j - 1);
      yield { list: list.map(a => a) };
    }
  }
  return list;
}

export function* comb(exchange, compare, list) {
  let sorted = false;
  let gap = Math.floor(list.length - 1);

  function nextGap(gap) {
    return gap - 1;
  }

  while (!sorted) {
    let swaps = 0;
    for (let i = 0; i < list.length - gap; i++) {
      if (compare(list[i], list[i + gap]) > 0) {
        exchange(list, i, i + gap);
        yield { list: list.map(a => a) };
        swaps++;
      }
    }

    if (gap === 1) {
      if (swaps === 0) sorted = true;
    } else {
      gap = nextGap(gap);
    }
  }
};

export function* bubble(exchange, compare, list) {
  let sorted = false;
  let bubbleTo = list.length - 1;
  while (!sorted) {
    let exchanges = 0;
    for (let i = 0; i < bubbleTo; i++) {
      if (compare(list[i], list[i + 1]) > 0) {
        exchange(list, i, i + 1);
        yield { list: list.map(a => a) };
        exchanges++;
      }
    }
    if (exchanges === 0) sorted = true;
    bubbleTo--;
  }
  return list;
};

export function* selection(exchange, compare, list) {
  for (let i = 0; i < list.length - 1; i++) {
    let min = i;
    for (let j = i + 1; j < list.length; j++) {
      const comparison = compare(list[min], list[j]);
      if (comparison > 0) {
        min = j;
      }
    }
    // Exchange positions if not already in the correct location.
    if (min !== i) {
      exchange(list, min, i);
      yield { list: list.map(a => a) };
    }
  }
  // Return the list even though it's mutatated so algorithms can be easily interchanged in pixel sorter.
  return list;
};

export function* cycle(exchange, compare, list) {
  for (let cycle = 0; cycle < list.length - 2; cycle++) {
    let item = list[cycle];
    let pos = cycle;

    for (let i = cycle + 1; i < list.length; i++) {
      if (compare(item, list[i]) > 0) {
        pos++;
      }
    }

    // Item is in correct position.
    if (pos === cycle) continue;

    // Skip over duplicate items
    while (pos < list.length && compare(item, list[pos]) === 0) {
      pos++;
    }

    if (pos !== cycle) {
      item = exchange(list, pos, item);
      yield { list: list.map(a => a) };

      while (pos !== cycle) {
        pos = cycle;
        for (let i = cycle + 1; i < list.length; i++) {
          if (compare(item, list[i]) > 0) {
            pos++;
          }
        }

        // Skip over duplicate items
        while (pos < list.length && compare(item, list[pos]) === 0) {
          pos++;
        }

        if (compare(item, list[pos]) !== 0) {
          item = exchange(list, pos, item);
          yield { list: list.map(a => a) };
        }
      }
    }
  }
}

export function* merge(exchange, compare, list) {
  function* merge(list, low, mid, high) {
    // copy the relevant part of the list.
    const copy = [];
    for (let i = low; i < high; i++) {
      copy[i] = list[i];
    }

    let i1 = low; // first sorted list index.
    let i2 = mid; // second sorted list index.
    for (let i = low; i < high; i++) {
      // When the mid/high list is exhausted can just take the rest of the low/mid list...
      if (i2 >= high) {
        exchange(copy, list, i1, i);
        i1++;
        // and viceversa.
      } else if (i1 >= mid) {
        exchange(copy, list, i2, i);
        i2++;
      } else if (compare(copy[i1], copy[i2]) <= 0) {
        // take the smaller element and place it at position i.
        exchange(copy, list, i1, i);
        // The element from the first list is now used to increase its index.
        i1++;
      } else {
        exchange(copy, list, i2, i);
        i2++;
      }
      
    }
    yield { list: list.map(a => a) };
  }

  function* splitMerge(list, low, high) {
    if (high <= low + 1) return;
    const mid = low + Math.floor((high - low) / 2);

    for (let v of splitMerge(list, low, mid)) {
      yield v;
    }

    for (let v of splitMerge(list, mid, high)) {
      yield v;
    }

    for (let v of merge(list, low, mid, high)) {
      yield v;
    }
  }

  for (let v of splitMerge(list, 0, list.length)) {
    yield v;
  }
  return list;
};

export function* quick(exchange, compare, list) {
  function* partition(list, low, high) {
    // Base case: List is too small to partition.
    if (high <= low) return;

    // I'll just use the last item of the list as the pivot.
    // May explore other ways of choosing the pivot.
    let pivot = high;
    // yield { pivot };
    let i = low;
    let j = high - 1;
    while (true) {
      // Need to work backwards and forwards though the list exchanging elements where needed.
      // Find a low element that needs to be swapped.
      while (compare(list[i], list[pivot]) <= 0) {
        if (i === high) break;
        i += 1;
      }

      // Find a high element to swap.
      while (compare(list[j], list[pivot]) >= 0) {
        if (j === low) break;
        j -= 1;
      }

      // Break out of the loop.
      if (i >= j) {
        break;
      }

      // Swap the low and high elements.
      exchange(list, i, j);
      yield { list: list.map(a => a) };
    }

    // Put the pivot between the partitions
    exchange(list, i, pivot);
    yield { list: list.map(a => a) };

    // Partition the list smaller than the pivot.
    for (let v of partition(list, low, i - 1)) {
      yield v;
    }
    // Partition the list larger than the pivot.
    for (let v of partition(list, i + 1, high)) {
      yield v;
    }
  }

  // partition(list, 0, list.length - 1);
  for (let v of partition(list, 0, list.length - 1)) {
    yield v;
  }
  return list;
}

export function* cocktail(exchange, compare, list) {
  let sorted = false;
  // 1 to pass through the list left-to-right. -1 for right-to-left pass.
  let dir = 1;
  let sortedLeft = -1;
  let sortedRight = list.length;
  while (!sorted) {
    let exchanges = 0;
    // Since i is moving both directions also need to make sure i doesn't pass the beginning of the list as well.
    for (let i = (dir > 0) ? sortedLeft + 1 : sortedRight - 1; i < sortedRight - dir && i > sortedLeft - dir; i += dir) {
      // Multiply * dir to normalize comparison.
      // 1 * compare(a, b) === -1 * compare(b, a)
      if (dir * compare(list[i], list[i + dir]) > 0) {
        exchange(list, i, i + dir);
        exchanges++;
        yield { list: list.map(a => a) };
      }
    }
    // update the known sorted items
    if (dir > 0) {
      sortedRight -= 1;
    } else {
      sortedLeft += 1;
    }
    // Switch direction.
    dir = -dir;
    // Check if the list is sorted.
    if (exchanges === 0) sorted = true;
  }
  return list;
}

export function* counting(max, exchange, key, list) {
  // Store the count of each unique object in the list.
  let counts = [];
  for (let i = 0; i <= max; i++) {
    counts[i] = { els: [] };
  }

  for (let i = 0; i < list.length; i++) {
    const count = counts[key(list[i])];
    count.els.push(list[i]);
  }

  const out = []
  for (let i = 0; i < counts.length; i++) {
    for (let j = 0; j < counts[i].els.length; j++) {
      out.push(counts[i].els[j]);
    }
  }

  for (let i = 0; i < list.length; i++) {
    exchange(out, list, i, i);
    yield { list: list.map(a => a) };
  }
}

export function* radix(max, exchange, key, list) {
  // Get the number to multiply by so numbers arent floats.
  const mult = Math.pow(10, list.reduce((acc, el) => {
    const [n, f] = key(el).toString().split(".");
    if (f && f.length > acc) {
      return f.length;
    } else {
      return acc;
    }
  }, 0));
  for (let i = 1; Math.floor((max * mult) / i) > 0; i = i * 10) {
    for (let v of counting(10, exchange, (el) => {
      const n = key(el) * mult;
      return Math.floor(n / i) % 10;
    }, list)) {
      yield v;
    }
  }
}

export function* bogo(shuffle, compare, list) {
  let sorted = false;

  for (let i = 0; i < list.length - 1; i++) {
    if (compare(list[i], list[i + 1]) > 0) {
      sorted = false;
      break;
    }
    // if it gets through the whole list then the list is sorted
    sorted = true;
  }
  while (!sorted) {
    shuffle(list);
    yield { list: list.map(a => a) };

    for (let i = 0; i < list.length - 1; i++) {
      if (compare(list[i], list[i + 1]) > 0) {
        sorted = false;
        break;
      }
      // if it gets through the whole list then the list is sorted
      sorted = true;
    }
  }
  yield { list: list.map(a => a) };
}

export function* heap(exchange, compare, list) {
  // Subtree is index into the array. The subtree chilren must already be a heaps.
  function* heapify(size, subtree) {
    let root = subtree;
    // get the children
    let left = 2 * subtree + 1;
    let right = 2 * subtree + 2;

    // yield { subtree: { root, left, right }, compare: [] };

    if (left < size && (
      // yield { compare: [left, root] }, 
      compare(list[left], list[root])) > 0) {
      root = left;
    }

    if (right < size && (
      // yield { compare: [right, root] }, 
      compare(list[right], list[root]) > 0)) {
      root = right;
    }

    if (subtree !== root) {
      exchange(list, root, subtree);
      yield { list: list.map(a => a) };
      // affected subtree now needs to be heapified.
      for (let v of heapify(size, root)) {
        yield v;
      }
    }
  }

  // Create the heap.
  for (let i = Math.floor(list.length / 2 - 1); i >= 0; i--) {
    for (let v of heapify(list.length, i)) {
      yield v;
    }
  }

  // Iterate through the list taking the smallest element and placing it at the beginning.
  // Then heapify the affected subtree.
  for (let i = list.length - 1; i >= 0; i--) {
    exchange(list, 0, i);
    yield { list: list.map(a => a), sortedRight: i };
    for (let v of heapify(i, 0)) {
      yield v;
    }
  }

  // yield { sorted: true };
}

export function* bitonic(exchange, compare, list) {
  const UP = 1;
  const DOWN = 0;
  for (let v of bitonicSort(list, 0, list.length, UP)) {
    yield v;
  }

  function compareAndSwap(list, i, j, dir) {
    if (compare(list[i], list[j], dir) > 0) {
      exchange(list, i, j);
    }
  }

  function* bitonicSort(list, low, count, dir) {
    if (count > 1) {
      const k = Math.floor(count / 2);
      for (let v of bitonicSort(list, low, k, UP)) {
        yield v;
      }
      for (let v of bitonicSort(list, low + k, k, DOWN)) {
        yield v;
      }
      for (let v of bitonicMerge(list, low, count, dir)) {
        yield v;
      }
    }

  }

  function* bitonicMerge(list, low, count, dir) {
    if (count > 1) {
      const k = Math.floor(count / 2);
      for (let i = low; i < low + k; i++) {
        compareAndSwap(list, i, i + k, dir);
        yield { list: list.map(a => a) };
      }
      for (let v of bitonicMerge(list, low, k, dir)) {
        yield v;
      }
      for (let v of bitonicMerge(list, low + k, k, dir)) {
        yield v;
      }
    }
  }
}

export function quad(cmp, list) {

  swap(list);

  const nmemb = list.length;
  const tmp = [];
  let offset, block = 4;
  let pta = 0;
  let pts = 0;
  let c, c_max, d, d_max, end;

  // end = array;
  end = nmemb;

  while (block < nmemb) {
    offset = 0;
    console.log('new block', block);

    while (offset + block < nmemb) {
      // pta = array;
      pta += offset;

      d_max = pta + block;

      if (cmp(list[d_max - 1], list[d_max]) <= 0) {
        if (offset + block * 3 < nmemb) {
          d_max = pta + block * 3;

          if (cmp(list[d_max - 1], list[d_max]) <= 0) {
            d_max = pta + block * 2;

            if (cmp(list[d_max - 1], list[d_max]) <= 0) {
              offset += block * 4;
              continue;
            }
            pts = 0;

            c = pta;
            c_max = pta + block * 2;
            d = c_max;
            d_max = offset + block * 4 <= nmemb ? d + block * 2 : end;

            while (c < c_max) {
              tmp[pts++] = list[c++];
            }

            while (d < d_max) {
              tmp[pts++] = list[d++];
            }

            step3();
          }
          pts = 0;

          c = pta;
          c_max = pta + block * 2;

          while (c < c_max) {
            tmp[pts++] = list[c++];
          }

          step2();
        }
        else if (offset + block * 2 < nmemb) {
          d_max = pta + block * 2;

          if (cmp(list[d_max - 1], list[d_max]) <= 0) {
            offset += block * 4;
            continue;
          }
          pts = 0;

          c = pta;
          c_max = pta + block * 2;

          while (c < c_max) {
            tmp[pts++] = list[c++];
          }

          step2();
        }
        else {
          offset += block * 4;
          continue;
        }
      }

      // step1:
      console.log('step1');
      pts = 0;

      c = pta;
      c_max = pta + block;

      d = c_max;
      d_max = offset + block * 2 <= nmemb ? d + block : end;

      if (cmp(list[c_max - 1], list[d_max - 1]) <= 0) {
        while (c < c_max) {
          while (cmp(list[c], list[d]) > 0) {
						tmp[pts++] = list[d++];
          }
					tmp[pts++] = list[c++];
        }
        while (d < d_max)
					tmp[pts++] = list[d++];
      }
      else if (cmp(list[c], list[d_max - 1]) > 0) {
        while (d < d_max) {
          tmp[pts++] = list[d++];
        }

        while (c < c_max) {
          tmp[pts++] = list[c++];
        }
      }
      else {
        while (d < d_max) {
          while (cmp(list[c], list[d]) <= 0) {
						tmp[pts++] = list[c++];
          }
					tmp[pts++] = list[d++];
        }

        while (c < c_max) {
					tmp[pts++] = list[c++];
        }
      }
      step2()

      function step2() {
        console.log('step2');
        if (offset + block * 2 < nmemb) {
          c = pta + block * 2;

          if (offset + block * 3 < nmemb) {
            c_max = c + block;
            d = c_max;
            d_max = offset + block * 4 <= nmemb ? d + block : end;

            if (cmp(list[c_max - 1], list[d_max - 1]) <= 0) {
              while (c < c_max) {
                while (cmp(list[c], list[d]) > 0) {
								  tmp[pts++] = list[d++];
                }
                tmp[pts++] = list[c++];
              }
              while (d < d_max) {
                tmp[pts++] = list[d++];
              }
            }
            else if (cmp(list[c], list[d_max - 1]) > 0) {
              while (d < d_max) {
                tmp[pts++] = list[d++];
              }
              while (c < c_max) {
                tmp[pts++] = list[c++];
              }
            }
            else {
              while (d < d_max) {
                while (cmp(list[c], list[d]) <= 0) {
								 tmp[pts++] = list[c++];
                }
							  tmp[pts++] = list[d++];
              }
              while (c < c_max) {
                tmp[pts++] = list[c++];
              }
            }
          }
          else {
            while (c < end) {
              tmp[pts++] = list[c++];
            }
          }
        }
        step3();
      }

      

      // This seems to put the temp array back in the list.
      // Assumtion based on pta being on lefthand side expression.
      // Probably need to make changes to c and d variables.
      function step3() {
        console.log('step3');
        pts = swap;

        c = pts;

        if (offset + block * 2 < nmemb) {
          c_max = c + block * 2;

          d = c_max;
          d_max = offset + block * 4 <= nmemb ? d + block * 2 : pts + nmemb - offset;

          if (cmp(tmp[c_max - 1], tmp[d_max - 1]) <= 0) {
            while (c < c_max) {
              while (cmp(tmp[c], tmp[d]) > 0) {
							  list[pta++] = tmp[d++];
              }
						  list[pta++] = tmp[c++];
            }
            while (d < d_max) {
              list[pta++] = tmp[d++];
            }
          }
          else if (cmp(tmp[c], tmp[d_max - 1]) > 0) {
            while (d < d_max) {
              list[pta++] = tmp[d++];
            }
            while (c < c_max) {
              list[pta++] = tmp[c++];
            }
          }
          else {
            while (d < d_max) {
              while (cmp(tmp[d], tmp[c]) > 0) {
							  list[pta++] = list[c++];
              }
						  list[pta++] = tmp[d++];
            }
            while (c < c_max) {
              list[pta++] = tmp[c++];
            }
          }
        }
        else {
          d_max = pts + nmemb - offset;

          while (c < d_max) {
            list[pta++] = tmp[c++];
          }
        }
        offset += block * 4;
      }
      block *= 4;
    }
  }

  function swap(arr) {
    for (let i = 0; i + 4 <= arr.length; i += 4) {
      let tmp = [];
      if (arr[i + 0] > arr[i + 1]) {
        tmp[0] = arr[i + 1];
        tmp[1] = arr[i + 0];
      } else {
        tmp[0] = arr[i + 0];
        tmp[1] = arr[i + 1];
      }

      if (arr[i + 2] > arr[i + 3]) {
        tmp[2] = arr[i + 3];
        tmp[3] = arr[i + 2];
      } else {
        tmp[2] = arr[i + 2];
        tmp[3] = arr[i + 3];
      }

      if (tmp[1] <= tmp[2]) {
        arr[i + 0] = tmp[0];
        arr[i + 1] = tmp[1];
        arr[i + 2] = tmp[2];
        arr[i + 3] = tmp[3];
      } else if (tmp[0] > tmp[3]) {
        arr[i + 0] = tmp[2];
        arr[i + 1] = tmp[3];
        arr[i + 2] = tmp[0];
        arr[i + 3] = tmp[1];
      } else {
        if (tmp[0] <= tmp[2]) {
          arr[i + 0] = tmp[0];
          arr[i + 1] = tmp[2];
        } else {
          arr[i + 0] = tmp[2]
          arr[i + 1] = tmp[0]
        }

        if (tmp[1] <= tmp[3]) {
          arr[i + 2] = tmp[1];
          arr[i + 3] = tmp[3];
        } else {
          arr[i + 2] = tmp[3];
          arr[i + 3] = tmp[1];
        }
      }
    }
  }
}

// export function quad(compare, list) {
//   const tmp = [];
//   let offset;
//   let block = 4;
//   const nmemb = list.length;

//   swap(list);

//   while (block < nmemb) {
//     offset = 0;

//     while (offset + block < nmemb) {
//       const pta = offset;

//       let dmax = pta + block;

//       if (compare(list[dmax-1], list[dmax]) <= 0) {
//         if (offset + block * 3 < nmemb) {
//           dmax = pta + block * 3;
//           if (compare(list[dmax - 1], list[dmax]) <= 0) {
//             dmax = pta + block * 2;
//             if (compare(list[dmax-1], list[dmax]) <= 0) {
//               offset += block * 4;
//               continue;
//             }
//             const c = pta;
//             const cmax = pta + block * 2;
//             const d = cmax;
//             dmax = offset + block * 4 <= nmemb ? d + block * 2 : nmemb;
//             for (let i = c; i < cmax; i++) {
//               tmp[i] = list[i];
//             }
//             for (let i = d; i < dmax; i++) {
//               tmp[i] = list[i];
//             }
//             step3();
//           }
//           const c = pta;
//           const cmax = pta + block * 2;
//           const d = cmax;
//           dmax = offset + block * 4 <= nmemb ? d + block * 2 : nmemb;
//           for (let i = c; i < cmax; i++) {
//             tmp[i] = list[i];
//           }
//           step2();
//         } else if (offset + block * 2 < nmemb) {
//           dmax = pta + block * 2;
//           if (compare(list[dmax-1], list[dmax]) <= 0) {
//             offset += block * 4;
//             continue;
//           }
//           const c = pta;
//           const cmax = pta + block * 2;
//           for (let i = c; c < cmax; i++) {
//             tmp[i] = list[i];
//           }
//           step2();
//         } else {
//           offset += block * 4;
//           continue
//         }
//       }

//       // Step 1

//       const c = pta;
//       const cmax = pta + block;
//       const d = cmax;
//       dmax = offset + block * 2 <= nmemb ? d + block : nmemb;
//       if (compare(list[cmax-1], list[dmax-1]) <= 0) {
//         for (let i = c; i < cmax; i++) {
//           for (let j = d; compare(list[i], list[j]) > 0; j++) {
//             tmp[j] = list[j]
//           }
//           tmp[i] = list[i];
//         }
//       } else if (compare(list[c], list[dmax-1]) > 0) {
//         for (let i = d; i < dmax; i++) {
//           tmp[i] = list[i];
//         }
//         for (let i = c; i < cmax; i++) {
//           tmp[i] = list[i];
//         }
//       } else {
//         for (let i = d; i < dmax; i++) { // line 632
//           for (let j = c; compare(list[j], list[i]) <= 0; j++) {
//             tmp[j] = list[j]
//           }
//           tmp[i] = list[i];
//         }
//         // Possibly incorrect. c might be updated in above step.
//         for (let i = c; i < cmax; i++) { // line 641
//           tmp[i] = list[i]
//         }
//       }

//       // Step 2

//       // Step 3

//       block *= 4;
//     }
//   }

//   function step2() {
//     if (offset + block * 2 < nmemb) {
//       const c = pta + block * 2;
//       if (offset + block * 3 < nmemb) {
//         const cmax = c + block;
//         const d = cmax;
//         const dmax = offset + block * 4 <= nmemb ? d + block : nmemb;
//         if (compare(list[cmax-1], list[dmax-1]) <= 0) {
//           for (let i = c; i < cmax; i++) {
//             for (; compare(list[i], list[d]) > 0; d++) {
//               tmp[d] = list[d];
//             }
//             tmp[i] = list[i];
//           }
//           for (; d < dmax; d++) {
//             tmp[d] = list[d];
//           }
//         } else if (compare(list[c], list[dmax-1]) > 0) {
//           while (d < dmax) {
//             tmp[d] = list[d];
//             d++;
//           }
//           while (c < cmax) {
//             tmp[c] = list[c];
//             c++;
//           }
//         } else {
//           while (d < dmax) {
//             while (compare(list[c], list[d]) <= 0) {
//               tmp[c] = 
//             }
//           }
//         }
//       }
//     }
//   }

//   function step3() { }

//   function swap(arr) {
//     for (let i = 0; i + 4 <= arr.length; i += 4) {
//       let tmp = [];
//       if (arr[i+0] > arr[i+1]) {
//         tmp[0] = arr[i+1];
//         tmp[1] = arr[i+0];
//       } else {
//         tmp[0] = arr[i+0];
//         tmp[1] = arr[i+1];
//       }

//       if (arr[i+2] > arr[i+3]) {
//         tmp[2] = arr[i+3];
//         tmp[3] = arr[i+2];
//       } else {
//         tmp[2] = arr[i+2];
//         tmp[3] = arr[i+3];
//       }

//       if (tmp[1] <= tmp[2]) {
//         arr[i+0] = tmp[0];
//         arr[i+1] = tmp[1];
//         arr[i+2] = tmp[2];
//         arr[i+3] = tmp[3];
//       } else if (tmp[0] > tmp[3]) {
//         arr[i+0] = tmp[2];
//         arr[i+1] = tmp[3];
//         arr[i+2] = tmp[0];
//         arr[i+3] = tmp[1];
//       } else {
//         if (tmp[0] <= tmp[2]) {
//           arr[i+0] = tmp[0];
//           arr[i+1] = tmp[2];
//         } else {
//           arr[i+0] = tmp[2]
//           arr[i+1] = tmp[0]
//         }

//         if (tmp[1] <= tmp[3]) {
//           arr[i+2] = tmp[1];
//           arr[i+3] = tmp[3];
//         } else {
//           arr[i+2] = tmp[3];
//           arr[i+3] = tmp[1];
//         }
//       }
//     }
//   }

//   console.log(list);
// }