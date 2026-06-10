import dotenv from 'dotenv';

dotenv.config({
   path: '.env',
});

//DNS import
import dns from 'node:dns/promises';
dns.setServers(['1.1.1.1']);
