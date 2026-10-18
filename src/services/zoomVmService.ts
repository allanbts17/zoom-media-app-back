/* eslint-disable max-len, require-jsdoc, valid-jsdoc */
import {randomUUID} from "crypto";
import {GoogleAuth} from "google-auth-library";
import {ZoomBotError} from "./zoomBotService";

const project = "zoom-app-dev";
const zone = "us-central1-a";
const instance = "zoom-bot-vm";
const root = `https://compute.googleapis.com/compute/v1/projects/${project}/zones/${zone}`;
const instancePath = `/projects/${project}/zones/${zone}/instances/${instance}`;
const instanceUrl = `${root}/instances/${instance}`;
const auth = new GoogleAuth({scopes: ["https://www.googleapis.com/auth/cloud-platform"]});
interface ComputeData {
  status?: string; name?: string; targetLink?: string;
  error?: {errors?: Array<{code?: string}>};
}
interface ComputeRequest {method: "GET" | "POST"; url: string; data?: object; params?: object}
type Transport = (request: ComputeRequest) => Promise<ComputeData>;
const transport: Transport = async (options) => {
  const client = await auth.getClient();
  return (await client.request<ComputeData>({...options, timeout: 8000, retry: false, maxRedirects: 0})).data;
};
export interface VmState {
  name: string; status: string;
  operation?: {name: string; status: string; error: string | null};
  no_op?: boolean;
}

/** Fixed instance only: the caller cannot choose a project, zone or VM. */
export class ZoomVmService {
  constructor(private readonly request: Transport = transport) {}

  private async call(options: ComputeRequest): Promise<ComputeData> {
    try {
      return await this.request(options);
    } catch (error: unknown) {
      const status = (error as {response?: {status?: number}}).response?.status;
      if (status === 403) throw new ZoomBotError(503, "VM_CONTROL_PERMISSION_DENIED");
      if (status === 404) throw new ZoomBotError(404, "VM_NOT_FOUND");
      if (status === 409) throw new ZoomBotError(409, "VM_STATE_CONFLICT");
      throw new ZoomBotError(503, "VM_CONTROL_UNAVAILABLE");
    }
  }

  async state(operation?: string): Promise<VmState> {
    if (operation !== undefined && !/^[A-Za-z0-9_-]{1,128}$/.test(operation)) {
      throw new ZoomBotError(400, "INVALID_VM_OPERATION");
    }
    const vm = await this.call({method: "GET", url: instanceUrl});
    const result: VmState = {name: instance, status: vm.status || "UNKNOWN"};
    if (operation) {
      const op = await this.call({method: "GET", url: `${root}/operations/${operation}`});
      if (!op.targetLink?.endsWith(instancePath)) throw new ZoomBotError(400, "INVALID_VM_OPERATION");
      result.operation = this.operation(op);
    }
    return result;
  }

  private operation(value: ComputeData): NonNullable<VmState["operation"]> {
    const raw = value.error?.errors?.[0]?.code;
    return {name: value.name || "", status: value.status || "PENDING",
      error: value.error ? (raw && /^[A-Z0-9_]{1,100}$/.test(raw) ? raw : "VM_OPERATION_FAILED") : null};
  }

  async change(action: "start" | "stop", requestId?: string): Promise<{status: number; data: VmState}> {
    if (requestId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
      throw new ZoomBotError(400, "INVALID_IDEMPOTENCY_KEY");
    }
    if (requestId === "00000000-0000-0000-0000-000000000000") throw new ZoomBotError(400, "INVALID_IDEMPOTENCY_KEY");
    const vm = await this.state();
    const done = action === "start" ? "RUNNING" : "TERMINATED";
    const pending = action === "start" ? ["PROVISIONING", "STAGING"] : ["STOPPING"];
    if (vm.status === done || pending.includes(vm.status)) {
      return {status: vm.status === done ? 200 : 202, data: {...vm, no_op: true}};
    }
    if (vm.status !== (action === "start" ? "TERMINATED" : "RUNNING")) {
      throw new ZoomBotError(409, "VM_STATE_CONFLICT");
    }
    const op = await this.call({method: "POST", url: `${instanceUrl}/${action}`, data: {},
      params: {requestId: requestId || randomUUID()}});
    const operation = this.operation(op);
    // GCE acknowledges asynchronously. DONE may itself contain an error.
    return {status: 202, data: {...vm, status: action === "start" ? "PROVISIONING" : "STOPPING", operation, no_op: false}};
  }
}
export const zoomVmService = new ZoomVmService();
