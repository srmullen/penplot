export class Queue {
  constructor(items = []) {
    this.items = items;
    this.length = this.items.length;
  }

  push(item) {
    this.items.push(item);
    this.length++;
  }

  pop() {
    const [item, ...rest] = this.items;
    this.items = rest;
    this.length = rest.length;
    return item;
  }

  contains(item) {
    return this.items.findIndex(el => el === item) > -1;
  }
}

export class OrderedSet {
  constructor(items = []) {
    this.order = [];
    this.items = items.reduce((acc, item) => {
      const key = this.key(item);
      this.order.push(key);
      return { ...acc, [key]: item };
    }, {});
  }

  add(item) {
    const key = this.key(item);
    if (!this.items[key]) {
      this.order.push(key);
      this.items[key] = item;
    }
  }

  contains(item) {
    const key = this.key(item);
    return !!this.items[key];
  }

  remove(item) {
    const key = this.key(item);
    delete this.items[key];
  }

  // Override this method if unique keys need to be created for the items.
  key(item) {
    return item;
  }

  toArray() {
    return this.order.map(key => this.items[key]);
  }
}