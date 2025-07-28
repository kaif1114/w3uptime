//DTO: Data Transfer Object

//DTO is used to transfer data between the client and the server, or server and client or any other data transfer

//DTO are basically just classes or interfaces defining shape of objects inside our data transfer

//For example: you are expecting a user to send you a name, age, and email in request body, by default you will not have any intellisense and typesafety in request.body because typescript does not know what is going to be inside request body so you create a DTO which is an interface and you annotate type for request like this request: Request<{}, {}, UserDTO> . We are utilizing typescript generics here


//This helps keep things organized, ensures typesafety and also helps us to validate the data that is being transferred