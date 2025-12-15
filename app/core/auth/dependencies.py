from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request
from app.core.auth import utils
from app.core import exceptions


class TokenBearer(HTTPBearer):
    def __init__(self, auto_error= True):
        super().__init__(auto_error=auto_error)

    async def __call__(self, request:Request) -> HTTPAuthorizationCredentials | None:
        creds = await super().__call__(request)
        token = creds.credentials

        token_data = utils.decode_access_token(token)

        
        if not self.token_valid(token):
            print(1)
            raise exceptions.InvalidToken()
        
        self.verify_token_data(token_data)

        # if await token_in_blocklist(token_data['jti']):
        #     raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail={
        #         "error": "Invalid or revoked token",
        #         "resolve": "login in or provide new access token"
        #     })

        
        if token_data is None:
            print(2)
            raise exceptions.InvalidToken()
        
        return token_data
        
    def token_valid(self, token:str):
        token_data = utils.decode_access_token(token)

        return True if token_data is not None else False
    
    def verify_token_data(self, token_data):
        raise NotImplementedError("Please override this method")
    
class AccesTokenBearer(TokenBearer):
    def verify_token_data(self, token_data:dict):
        if token_data and token_data["refresh"]:
            raise exceptions.AccessToken()
        
class RefreshTokenBearer(TokenBearer):
    def verify_token_data(self, token_data:dict):
        if token_data and not token_data["refresh"]:
            raise exceptions.RefreshToken()