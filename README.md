 # Digital Ocean Dynamic DNS daemon
  
 (с) Sergey Petrenko 2016
 spetrenko@me.com
  
 This daemon made for dynamic updating of subdomain A-record in DNS-zone
 provided by DigitalOcean.com service.
 
 ## How to use
 Please set all required values in `config.default.ini`, rename it to `config.ini` and just start this script. You can set it up as daemon or service in your operating system.
 
 ## Attention
 This script can be a little bit buggy because it was made for my own purposes and has been published because of few my friends just want the same and they are too lazy to write it own. Use it on your own risk! It can damage your life, broke your car or even kill your cat! It's terrible and I will be sad on this but I can't help and don't take a responsibility for anything. 
 
 ## Troubleshooting
Script generates `updates.log` file, go there if you have issues. You can set debug to true in `config.ini` to enable more detailed logging.
 
