import { RetellWebClient } from "retell-client-js-sdk";

const retellWebClient = new RetellWebClient();

export interface RetellSession {
  access_token: string;
  call_id: string;
}

export const startRetellCall = async (
  onStatusChange: (status: "loading" | "active" | "inactive" | "error") => void
) => {
  try {
    onStatusChange("loading");
    
    const response = await fetch("/api/create-web-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create call: ${response.statusText}`);
    }
    
    const data: RetellSession = await response.json();
    
    await retellWebClient.startCall({
      accessToken: data.access_token,
    });
    
    onStatusChange("active");
    
    retellWebClient.on("call_ended", () => {
      onStatusChange("inactive");
    });
    
    retellWebClient.on("error", (error) => {
      console.error("Retell SDK Error:", error);
      onStatusChange("error");
    });

  } catch (error) {
    console.error("Retell Call Error:", error);
    onStatusChange("error");
  }
};

export const stopRetellCall = () => {
  retellWebClient.stopCall();
};

export const isCallActive = () => {
  // The SDK doesn't always expose a simple getter, but we can track it via state in components
  return true; // placeholder
};
