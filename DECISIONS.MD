# Decisions File
## Crisis.py
### What is this file about?
* This file basically contains keywords or phrases which are suicide inciting or considered life threatening. LLMs how many ever safeguards they have are designed in a way which accepts and appeases the user and have some chances of indulging the users is self-harm or discussion in ideas which may cause self harm. This file basically makesure to it ends the request and give hardcoded helplines  if the user feels to cause harm to himself and no call is given to the LLM API no credits or turns are cost.
### Why does this exist as a separate module rather than being folded elsewhere?
* This is a feature where in the chat it ends the request  incase the user thinks of harm or self harm. It is written as seperate modulue because first thing it is easier to import and read and edit functions from pages rather than being folded the next reason is this runs before the model call the app first chks it with the patterns it has first after entering then it goes to teh LLM api.
### What happens when it fails?
* If somebody paraphrases it goes to the model only the matching hardcoded  patterns and sentences returns the prevention policy.\bsuicide\b and \boverdose\b are bare word matches, so someone writing "I'm researching suicide prevention policy" or "the market overdosed on hype" gets the crisis response for no reason. A false positive that refuses a legitimate user.
### What would you change if you were writing it now?
* Currently I have just hard coded the words and phrases. What would i change is i would seperatly train a 1.5B or  3B which recognises the sucidal and ahrmful thoughts patterns and instantly delete it. I will deploy this model seperatly on AWS. I would also would include the feature to stop the whole session free of cost and the user needs to reset. This is because the user must feel the hassle of disccusing self harm with AI.
## ai_router.py
### What is this file about?
* Crucible normally runs with Anthropic sonnet by default on 4 of 5 tiers. On the 4th (Alchemist) tier the user can select his/her choice and use his/her api key. The main objective of alchemist tier is BYOK(BRING YOUR OWN KEY). This file acts as a router hand has functions to chat generation from anthropic google and openai and these will be used if the user has given the model details in the providers. Along with this it extracts the final usage for each provider. If the provider is unrecognised it falls back to anrhropic. Incase u select another provider but not a model it has default model for each provider
### Why does this exist as a separate module rather than being folded elsewhere?
* The first reason is each LLM provider wants different inputs and putting it in a seperate module would make it much easier to read understand and develop future modifications.

* This feature is availbale for alchemist tier only and it activates only when the user is in the alchemist tier hence it exists as a seperate file rather than scafolding into another file.


### What happens when it fails?
* If the LLM provider deprecates the model the model will not accpet any requests and gives an error unless a developer updates the models or if the user provides the worng key or if the api credits in the users key are over it will develop an error. None of these are caught in this file, so the error reaches the user as so the error reaches the user as a stream that cuts off with no message, because the 200 status was sent before the provider call ran.
### What would you change if you were writing it now?
 * I connect to the providers endpoint to generate un-deprecated list of models. This list will be saaved as a cache everytime it generates every day at 12 am UTC so if incase the provider changes the endpoint a list will be displayed from cache until the developer fixes thAt.

 ## anthropic_service.py
 ### What is this file about?
 ### Why does this exist as a separate module rather than being folded elsewhere?
 ### What happens when it fails?
 ### What would you change if you were writing it now?




