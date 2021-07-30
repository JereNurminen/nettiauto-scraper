# nettiauto-scraper
A small scraper that takes some Nettiauto URLs, scrapes some interesting (to me) info and compiles it to a CSV. Made this to help myself compare some used cars while looking to buy one, so this is heavily biased towards the info I'm interested in. 

Note: As the Nettiauto listings are in Finnish anyway, the output is in Finnish too.

## How to use
There's two ways to use this, either by specifying the URL in a file or as an argument.

### With a file
Assuming you have a file that's just Nettiauto URLs, separated by new lines like this:
```
https://www.nettiauto.com/ferrari/812-superfast/12083011
https://www.nettiauto.com/volkswagen/polo/11991488
https://www.nettiauto.com/honda/cr-v/12181162
```
Running this command will print the CSV to stdout:
```
yarn -s start -f ./path-to-file-with-urls
```
### Without a file
You can also specify the URLs straight in the command like this:
```
yarn -s start https://www.nettiauto.com/ferrari/812-superfast/12083011 https://www.nettiauto.com/volkswagen/polo/11991488 https://www.nettiauto.com/honda/cr-v/12181162
```

## Options
```
    --help     Show help                                             [boolean]
    --version  Show version number                                   [boolean]
-d, --debug    A flag to toggle debug output        [boolean] [default: false]
-f, --file     File to read car URLs from               [string] [default: ""]
```
## TODO
* Add possibilty to provide additional info per car (things that are subjective or not in the listing, like "This car has a nice boot")
* Output straight into an .xlsx file
* Calculate estimated running costs? (based on fuel consumption, average diesel/petrol price and average amount of kilometers driven)
