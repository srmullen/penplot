import { Queue } from 'common/datastructures';
import { OrderedSet } from './datastructures';

export class Problem {
  constructor(init, goal) {
    this.init = init;
    this.goal = goal;
  }

  /**
   * Return the list of actions that can be executed from the given state.
   * @param {any} state 
   */
  actions(state) {}

  /**
   * Return the state that results from executing the given action
   * @param {any} state 
   * @param {Action} action 
   */
  result(state, action) {}

  /**
   * Returns true if the goal has been reached.
   * @param {any} state 
   */
  isGoal(state) {}
}

class Node {
  constructor(state, parent, action, cost = 0) {
    this.state = state;
    this.parent = parent;
    this.action = action;
    this.cost = cost;
  }

  /**
   * List the nodes reachable in one step from this node.
   */
  expand(problem) {
    const actions = problem.actions(this.state);
    return actions.map(action => this.child(problem, action));
  }

  /**
   * 
   */
  child(problem, action) {
    const next = problem.result(this.state, action);
    return new Node(next, this, action, 0);
  }

  /**
   * returns the sequence of actions to go from the root to this node.
   */
  solution() {
  }

  /**
   * Returns the list of nodes forming the path from the root node to this node.
   */
  path() {

  }
}

export function breadthFirstSearch(problem) {
  const node = new Node(problem.init);
  if (problem.isGoal(problem.init)) {
    return node;
  }
  const frontier = new Queue([node]);
  const explored = new StateSet();
  let count = 0;
  while (frontier.length && count < 1000) {
    count++;
    const node = frontier.pop();
    explored.add(node.state);
    for (let child of node.expand(problem)) {
      if (
        !explored.contains(child.state) &&
        !frontier.contains(el => stateKey(el.state) === stateKey(child.state))
      ) {
        if (problem.isGoal(child.state)) {
          return child;
        }
        frontier.push(child);
      }
    }
  }
}

export function breadthFirstFlood(
  problem, 
  { explored = new OrderedSet(), frontier = new Queue()} = {}
) {
  const node = new Node(problem.init);
  frontier.push(node);
  let count = 0;
  const maxCount = 10000;
  while (frontier.length && count < maxCount) {
    count++;
    const node = frontier.pop();
    explored.add(node.state);
    for (let child of node.expand(problem)) {
      if (
        !explored.contains(child.state) &&
        !frontier.contains(child)
      ) {
        frontier.push(child);
      }
    }
  }
  if (count >= maxCount) {
    console.log('Max count reached: ', count);
  }
  return explored;
}