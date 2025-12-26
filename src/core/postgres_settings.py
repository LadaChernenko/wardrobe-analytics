from pydantic_settings import BaseSettings, SettingsConfigDict


class PostgresSettings(BaseSettings):
    host: str
    port: int
    db: str
    user: str
    password: str

    model_config = SettingsConfigDict(env_file='.env', env_prefix='POSTGRES_', extra='allow')

    def get_connection_url(self) -> str:
        """
        Return connection url.

        :returns: str
        """
        return f'postgresql+psycopg2://{self.user}:{self.password}@{self.host}:{self.port}/{self.db}'  # noqa: WPS221, E501

    def get_dsn(self) -> dict:
        """
        Return dict with connection settings.

        :return: dict
        """
        return {
            'database': self.db,
            'user': self.user,
            'password': self.password,
            'host': self.host,
            'port': self.port,
        }


postgres_settings = PostgresSettings()

