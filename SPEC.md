Create a email bridge system that can be used to receive emails. (Send in the future implementation)

## Features

This system is binded to the domain tai.chat. And accessing it will allow a user to register a new email address at {name}@agent.tai.chat with a access token.

- The user register at tai.chat/register with a name and a token.
- Sending emails to the agent will save the email to an D1 database.
- The user can access the emails by accessing the tai.chat/v1/mail/retrieve/{name}/{access_token}

## Database Schema

High level schema:

- Users: stores the user's name and token.
- Mails: stores the emails with all the infomation

Other tables should be created as needed to satisfy modern database design.

## Worker

3 features of the worker:

- a front page that show basic information about the service.
- a register page that allow a user to register a new email address and save the user's name and token to the database.
- a retrieve page that allow a user to retrieve the emails by accessing the tai.chat/v1/mail/retrieve/{name}/{access_token}
- a email event handler that will be called when a new email is received, save the email to the database.

