var Cylon = require('cylon');

var robot = Cylon.robot({
  
  connections: {
    spark: { adaptor: 'spark', accessToken: 'my-access-token', deviceId: 'my-device-id' }
  },

  devices: {
    red: { driver: 'led', pin: 'D0'},
    green: { driver: 'led', pin: 'D1'}
  },

  work: function(my) {
    //start with both lights off
    my.red.turnOff()
    my.green.turnOff()   
  },
 
  lightUp: function(color) {
    if (color === "green"){
      robot.devices.red.turnOff()
      robot.devices.green.turnOn()
    }
    else {
      robot.devices.green.turnOff()
      robot.devices.red.turnOn()
    }
  }


}).start();

$( "#redBtn" ).click(function() {
      robot.commands.lightUp("red");
});
$( "#greenBtn" ).click(function() {
      robot.commands.lightUp("green");
});