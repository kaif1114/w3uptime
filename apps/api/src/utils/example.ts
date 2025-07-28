import { Example, ExampleResponse } from "../types/example";
export function example(example: Example): ExampleResponse {
  return {
    id: example.id,
    name: example.name,
    description: example.description,
  };
}