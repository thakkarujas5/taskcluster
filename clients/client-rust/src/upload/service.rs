use crate::Object;
use anyhow::Error;
use async_trait::async_trait;
use serde_json::Value;

/// A private wrapper around the necessary methods of the object service.  This is only necessary
/// to allow injecting a fake implementation during testing.
#[allow(non_snake_case)]
#[async_trait]
pub(super) trait ObjectService {
    async fn createUpload(&self, name: &str, payload: &Value) -> std::result::Result<Value, Error>;
    async fn finishUpload(&self, name: &str, payload: &Value) -> std::result::Result<(), Error>;
}

/// Trivial implementation of the ObjectService trait for the Object client struct
#[async_trait]
impl ObjectService for Object {
    async fn createUpload(&self, name: &str, payload: &Value) -> std::result::Result<Value, Error> {
        (self as &Object).createUpload(name, payload).await
    }
    async fn finishUpload(&self, name: &str, payload: &Value) -> std::result::Result<(), Error> {
        (self as &Object).finishUpload(name, payload).await
    }
}
