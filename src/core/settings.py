from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    access_token: str

    seg_output_path = "app/data/segment"
    data_root_path = "app/data/garments"
    model_config = SettingsConfigDict(env_file='.env', extra='allow')


settings = Settings()