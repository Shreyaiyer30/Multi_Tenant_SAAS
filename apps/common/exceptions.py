from rest_framework.views import exception_handler


def drf_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is None:
        return response

    if isinstance(response.data, dict) and "error" in response.data:
        return response

    detail = response.data
    code = "validation_error" if response.status_code == 400 else "error"
    response.data = {
        "error": code,
        "detail": detail,
    }
    return response
