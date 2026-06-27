import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);

// Shared Data client for the whole app.
export const client = generateClient();
