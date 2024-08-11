import SharedDriver from '../../lib/shared_driver'

class OvenDriver extends SharedDriver {

  async onInit (): Promise<void> {
    super.onInit();
  }
  
  async onPairListDevices() {
   
    var devices = [];
    const appliances = await this.app.getAppliances(); 
    
    for (let i = 0; i < appliances.length; i++) {
      const appliance = appliances[i];     
      let deviceCapabilities = [];
      if (appliance.properties?.reported?.applianceInfo?.applianceType === 'OV') {
        deviceCapabilities.push("execute_command"); 
        deviceCapabilities.push("LIGHT_onoff"); 
        
        deviceCapabilities.push("measure_doorState"); //doorState 
        deviceCapabilities.push("measure_timeToEnd"); //runningTime  
        deviceCapabilities.push("measure_stopTime"); //timeToEnd
        deviceCapabilities.push("measure_startTime"); //startTime
        deviceCapabilities.push("measure_targetTemperature"); //targetTemperatureC
        deviceCapabilities.push("measure_temperature"); //displayTemperatureC
        deviceCapabilities.push("measure_applianceState"); //applianceState
        deviceCapabilities.push("measure_applianceMode"); //program
        deviceCapabilities.push("measure_cyclePhase"); //processPhase
      }
      
      const device = { 
        name: appliance.applianceData.applianceName,
        data: { id: appliance.applianceId },
        capabilities: deviceCapabilities,
      };
      devices.push(device);
    }

    return devices;
  }

}

module.exports = OvenDriver;
