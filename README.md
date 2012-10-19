Comprehend.io
=============

Shitty for now, but will hopefully get better.

If you want to try it out:

    npm install

Then, set up your own conf.js:

    cp conf/conf.js.sample conf/conf.js

I recently had some issues with the WordNet cache/index.* and cache/data.* files downloading. If you receive an error saying "Unable to open index.adv" or something of the sort, you're SOL until I get a chance to troubleshoot.

The signup and login functionality may or may not work. Once you've created an account, you'll see a crappy dashboard with a text field. That will allow you to input arbitrary text, click "test", and then see the JSON result below. 

You may want to navigate to /dashboard/junk_topics once before you do much. That'll add stopwords to the database. Too lazy to automatically feed them in, even though it's probably not any more time-consuming than the method I implemented for now. Oh well.

Don't get your hopes up. It kind of sucks right now.
