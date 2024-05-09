import { writable } from "svelte/store";
import { localStore } from "./localStore";
import { TodoType } from "./types/todo.type";


export const alert = writable("Welcome to the to-do list app!");

const initialTodos: TodoType[] = [
    { id: 1, name: "Visit MDN web docs", completed: true },
    { id: 2, name: "Complete the Svelte Tutorial", completed: false },
  ];

export const todos = localStore("mdn-svelte-todo", initialTodos);