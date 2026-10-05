const {execFileSync}=require('node:child_process'),path=require('node:path');
for(const name of ['week-game.test.cjs','history.test.cjs','learning.test.cjs','listening.test.cjs'])execFileSync(process.execPath,[path.join(__dirname,name)],{stdio:'inherit'});
