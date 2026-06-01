"""Image storage abstraction.

If AWS_S3_BUCKET is set, uploads go to S3 (works with AWS S3, MinIO, Backblaze B2,
DigitalOcean Spaces, Cloudflare R2 — anything S3-compatible).

Otherwise, files are saved to the local UPLOAD_FOLDER and served via /static/uploads/.
"""
import os
from flask import current_app


def _s3_enabled():
    return bool(current_app.config.get('AWS_S3_BUCKET'))


def save_image(file_obj, filename, content_type='image/jpeg'):
    """Save an uploaded file. Returns the public URL."""
    if _s3_enabled():
        return _save_to_s3(file_obj, filename, content_type)
    return _save_to_local(file_obj, filename)


def _save_to_local(file_obj, filename):
    upload_folder = current_app.config['UPLOAD_FOLDER']
    os.makedirs(upload_folder, exist_ok=True)
    filepath = os.path.join(upload_folder, filename)
    file_obj.save(filepath)
    return f'/static/uploads/{filename}'


def _save_to_s3(file_obj, filename, content_type):
    try:
        import boto3
    except ImportError:
        current_app.logger.error('boto3 not installed but AWS_S3_BUCKET is set; falling back to local')
        return _save_to_local(file_obj, filename)

    cfg = current_app.config
    bucket = cfg['AWS_S3_BUCKET']
    region = cfg.get('AWS_S3_REGION') or None
    endpoint = cfg.get('AWS_S3_ENDPOINT_URL') or None
    key_id = cfg.get('AWS_ACCESS_KEY_ID') or None
    secret = cfg.get('AWS_SECRET_ACCESS_KEY') or None

    s3 = boto3.client(
        's3',
        region_name=region,
        endpoint_url=endpoint,
        aws_access_key_id=key_id,
        aws_secret_access_key=secret
    )
    key = f'uploads/{filename}'
    s3.upload_fileobj(
        file_obj,
        bucket,
        key,
        ExtraArgs={'ContentType': content_type, 'ACL': 'public-read'}
    )

    if endpoint:
        return f'{endpoint.rstrip("/")}/{bucket}/{key}'
    if region:
        return f'https://{bucket}.s3.{region}.amazonaws.com/{key}'
    return f'https://{bucket}.s3.amazonaws.com/{key}'
