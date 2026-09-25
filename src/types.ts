export interface DeviceCapability {
  type: string;
  reportable: boolean;
  retrievable: boolean;
  state?: {
    instance: string;
    value: any;
  };
  parameters?: any;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  room?: string;
  roomName: string;
  capabilities: DeviceCapability[];
}

export interface Room {
  id: string;
  name: string;
}

export interface Scenario {
  id: string;
  name: string;
  is_active: boolean;
}

export interface UserInfoResponse {
  status: string;
  rooms?: Room[];
  devices?: any[];
  scenarios?: any[];
}